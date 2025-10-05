interface FeaturedAuthor {
  id: string;
  name: string;
  biography: string;
  image: string;
  featuredBooks: string[];
}

const authors: FeaturedAuthor[] = [
  {
    id: "sabahattin-ali",
    name: "Sabahattin Ali",
    biography: "Sabahattin Ali (1907-1948), Türk edebiyatının en önemli yazarlarından biridir. Öykü ve romanlarında toplumsal gerçekçilik akımının öncülerinden olan yazar, keskin gözlemleri ve etkileyici anlatımıyla tanınır. Kürk Mantolu Madonna, İçimizdeki Şeytan ve Kuyucaklı Yusuf gibi unutulmaz eserlere imza atmıştır.",
    image: "https://images.pexels.com/photos/7034102/pexels-photo-7034102.jpeg",
    featuredBooks: ["TR-HK-63", "TR-HK-69", "TR-HK-76"]
  },
  {
    id: "sait-faik",
    name: "Sait Faik Abasıyanık",
    biography: "Sait Faik Abasıyanık (1906-1954), modern Türk öykücülüğünün en önemli isimlerinden biridir. İstanbul'un gündelik yaşamını, sıradan insanların hikayelerini ve deniz kültürünü eserlerine benzersiz bir duyarlılıkla yansıtmıştır. Semaver, Son Kuşlar ve Alemdağ'da Var Bir Yılan gibi önemli öykü kitaplarının yazarıdır.",
    image: "https://images.pexels.com/photos/7034250/pexels-photo-7034250.jpeg",
    featuredBooks: ["TR-HK-93", "TR-HK-97", "TR-HK-114"]
  }
];

export const getCurrentAuthor = (): FeaturedAuthor => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  return authors[currentMonth % authors.length];
};