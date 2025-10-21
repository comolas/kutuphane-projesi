import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product, CartItem, Order, OrderItem } from '../types';
import { UserCoupon } from '../types/coupon';
import { useAuth } from './AuthContext';

interface ShopContextType {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  appliedCoupon: UserCoupon | null;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: UserCoupon) => void;
  removeCoupon: () => void;
  createOrder: (paymentMethod: 'eft' | 'havale' | 'iyzico' | 'cash', notes?: string) => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  getCartTotal: () => number;
  getDiscountAmount: () => number;
  getFinalTotal: () => number;
  getCartItemCount: () => number;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<UserCoupon | null>(null);

  const fetchProducts = async () => {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    setProducts(productsData);
  };

  const fetchOrders = async () => {
    if (!user) return;
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    setOrders(ordersData);
  };

  useEffect(() => {
    fetchProducts();
    if (user) {
      fetchOrders();
      const savedCart = localStorage.getItem(`cart_${user.uid}`);
      if (savedCart) setCart(JSON.parse(savedCart));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`cart_${user.uid}`, JSON.stringify(cart));
    }
  }, [cart, user]);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (coupon: UserCoupon) => {
    setAppliedCoupon(coupon);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const getDiscountAmount = () => {
    if (!appliedCoupon || !appliedCoupon.discountPercent) return 0;
    const total = getCartTotal();
    return Math.round((total * appliedCoupon.discountPercent) / 100);
  };

  const getFinalTotal = () => {
    return getCartTotal() - getDiscountAmount();
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const createOrder = async (paymentMethod: 'eft' | 'havale' | 'iyzico' | 'cash', notes?: string) => {
    if (!user || !userData) throw new Error('Kullanıcı girişi gerekli');
    if (cart.length === 0) throw new Error('Sepet boş');

    const orderItems: OrderItem[] = cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error('Ürün bulunamadı');
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
      };
    });

    const order: Omit<Order, 'id'> = {
      userId: user.uid,
      userName: userData.displayName || user.email || '',
      userEmail: user.email || '',
      items: orderItems,
      totalAmount: getFinalTotal(),
      status: 'pending',
      paymentMethod,
      paymentStatus: 'waiting',
      createdAt: Timestamp.now(),
      notes,
      ...(appliedCoupon && { couponId: appliedCoupon.id }),
      discountAmount: getDiscountAmount(),
    };

    const orderId = (await addDoc(collection(db, 'orders'), order)).id;

    // Kupon kullanıldıysa işaretle
    if (appliedCoupon) {
      const couponRef = doc(db, 'users', user.uid, 'coupons', appliedCoupon.id);
      await updateDoc(couponRef, {
        isUsed: true,
        usedAt: Timestamp.now(),
        usedForOrderId: orderId,
      });
    }

    clearCart();
    await fetchOrders();
  };

  return (
    <ShopContext.Provider
      value={{
        products,
        cart,
        orders,
        appliedCoupon,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        createOrder,
        fetchProducts,
        fetchOrders,
        getCartTotal,
        getDiscountAmount,
        getFinalTotal,
        getCartItemCount,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within ShopProvider');
  return context;
};
