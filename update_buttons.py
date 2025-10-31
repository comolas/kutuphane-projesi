import os
import re

# Tab dosyalarının bulunduğu dizin
tabs_dir = r"c:\Kutuphane Projesi\src\components\admin\tabs"

# Güncellenecek dosyalar
files_to_update = [
    "AdminChatTab.tsx",
    "AdminCollectionDistribution.tsx", 
    "AdminGameReservationsTab.tsx",
    "AdminMagazinesTab.tsx",
    "BudgetTab.tsx",
    "CollectionManagementTab.tsx",
    "EventManagementTab.tsx",
    "FinesTab.tsx",
    "GameManagementTab.tsx",
    "LibraryCardsTab.tsx",
    "MessagesTab.tsx",
    "QuoteManagementTab.tsx",
    "ReportsTab.tsx",
    "ReviewManagementTab.tsx",
    "RewardClaimsTab.tsx",
    "RewardManagementTab.tsx",
    "ShopManagementTab.tsx",
    "UsersTab.tsx"
]

def update_button_styles(content):
    """Buton stillerini güncelle"""
    
    # Pattern 1: className içinde button olan ve min-h-[44px] olmayan satırları bul
    # Basit butonlar için
    patterns = [
        # px-X py-Y içeren ve min-h-[44px] olmayan butonlar
        (r'className="([^"]*\bpx-\d+[^"]*\bpy-\d+[^"]*)"(?![^<]*min-h-\[44px\])', 'add_mobile_styles'),
        # rounded-lg olan butonları rounded-xl yap
        (r'(className="[^"]*?)rounded-lg([^"]*")', r'\1rounded-xl\2'),
        # transition-colors olan butonları transition-all yap
        (r'(className="[^"]*?)transition-colors([^"]*")', r'\1transition-all\2'),
    ]
    
    for pattern, replacement in patterns:
        if replacement == 'add_mobile_styles':
            # min-h-[44px], shadow-md, hover:shadow-lg, hover:scale-105, touch-manipulation ekle
            def add_styles(match):
                existing = match.group(1)
                if 'min-h-[44px]' in existing:
                    return match.group(0)
                
                # Eksik stilleri ekle
                new_styles = existing
                if 'min-h-[44px]' not in new_styles:
                    new_styles += ' min-h-[44px]'
                if 'shadow-md' not in new_styles and 'shadow-lg' not in new_styles:
                    new_styles += ' shadow-md'
                if 'hover:shadow-lg' not in new_styles:
                    new_styles += ' hover:shadow-lg'
                if 'hover:scale-105' not in new_styles:
                    new_styles += ' hover:scale-105'
                if 'touch-manipulation' not in new_styles:
                    new_styles += ' touch-manipulation'
                if 'flex items-center justify-center' not in new_styles and 'flex' in new_styles:
                    new_styles = new_styles.replace('flex', 'flex items-center justify-center', 1)
                
                return f'className="{new_styles}"'
            
            content = re.sub(pattern, add_styles, content)
        else:
            content = re.sub(pattern, replacement, content)
    
    return content

# Her dosyayı güncelle
updated_count = 0
for filename in files_to_update:
    filepath = os.path.join(tabs_dir, filename)
    if not os.path.exists(filepath):
        print(f"Dosya bulunamadı: {filename}")
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        updated_content = update_button_styles(content)
        
        if content != updated_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f"✓ Güncellendi: {filename}")
            updated_count += 1
        else:
            print(f"- Değişiklik yok: {filename}")
    except Exception as e:
        print(f"✗ Hata ({filename}): {str(e)}")

print(f"\nToplam {updated_count} dosya güncellendi.")
