import requests
import json
import time
from typing import Dict, Optional

class FoodDataCollector:
    def __init__(self, usda_api_key: str):
        self.usda_api_key = usda_api_key
        self.usda_base_url = "https://api.nal.usda.gov/fdc/v1"
        
    def search_usda_food(self, food_name: str) -> Optional[Dict]:
        """Caută un aliment în baza de date USDA"""
        url = f"{self.usda_base_url}/foods/search"
        params = {
            "api_key": self.usda_api_key,
            "query": food_name,
            "pageSize": 1,
            "dataType": ["Survey (FNDDS)", "Foundation"]
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('foods'):
                return data['foods'][0]
            return None
        except Exception as e:
            print(f"Eroare la căutarea {food_name}: {e}")
            return None
    
    def extract_carbs(self, food_data: Dict) -> float:
        """Extrage carbohidrații (g/100g) din răspunsul USDA"""
        for nutrient in food_data.get('foodNutrients', []):
            if nutrient.get('nutrientName') == 'Carbohydrate, by difference':
                return round(nutrient.get('value', 0.0), 2)
        return 0.0
    
    def get_gi_estimate(self, food_name: str, carbs: float) -> int:
        """Estimează indicele glicemic bazat pe tipul de aliment"""
        gi_database = {
            # Pâine și cereale
            'bread': 70, 'white_bread': 75, 'whole_wheat_bread': 69,
            'rice': 73, 'pasta': 50, 'oatmeal': 55, 'gnocchi': 68,
            
            # Fructe
            'apple': 36, 'banana': 51, 'orange': 43, 'strawberry': 40,
            'watermelon': 76, 'grapes': 59, 'pineapple': 59,
            
            # Legume / amidonoase
            'carrot': 39, 'potato': 78, 'sweet_potato': 63,
            'corn': 52, 'peas': 48,
            
            # Deserturi / dulciuri
            'ice_cream': 51, 'chocolate_cake': 38, 'apple_pie': 44,
            'cheesecake': 55, 'donut': 76, 'pancakes': 67, 'waffles': 76,
            'tiramisu': 45, 'pudding': 44, 'creme_brulee': 47,
            'panna_cotta': 48, 'cannoli': 50, 'baklava': 60, 'churros': 72,
            'macarons': 54, 'beignets': 76, 'cupcake': 73, 'cake': 65,
            
            # Carne / pește / ou (GI ~ 0)
            'chicken': 0, 'beef': 0, 'pork': 0, 'fish': 0, 'salmon': 0,
            'steak': 0, 'sausage': 0, 'ribs': 0, 'duck': 0,
            'egg': 0, 'omelette': 0, 'tartare': 0, 'carpaccio': 0,
            'shrimp': 0, 'crab': 0, 'lobster': 0, 'oysters': 0,
            'mussels': 0, 'scallops': 0,
            
            # Lactate
            'milk': 39, 'yogurt': 41, 'cheese': 0, 'frozen_yogurt': 46,
            
            # Fast-food / preparate combinate
            'hamburger': 66, 'hot_dog': 90, 'sandwich': 55, 'pizza': 60,
            'burrito': 58, 'quesadilla': 52, 'taco': 55, 'nachos': 63,
            'fries': 75, 'poutine': 75,
            
            # Salate / paste tartinabile
            'salad': 15, 'hummus': 6, 'guacamole': 15, 'bruschetta': 55,
            
            # Supe / noodles
            'soup': 38, 'chowder': 40, 'bisque': 42, 'ramen': 73, 'pho': 70,
            'miso_soup': 35,
            
            # Preparate asiatice
            'sushi': 55, 'sashimi': 0, 'pad_thai': 50, 'fried_rice': 68,
            'dumplings': 60, 'gyoza': 60, 'spring_rolls': 70, 'samosa': 82,
            'bibimbap': 65, 'takoyaki': 70,
            
            # Preparate italiene
            'lasagna': 47, 'ravioli': 50, 'spaghetti': 50, 'risotto': 69,
            'macaroni': 47
        }
        
        food_lower = food_name.lower().replace('_', ' ')
        for key, gi in gi_database.items():
            if key in food_lower or food_lower in key:
                return gi
        
        # Estimare brută bazată pe carbohidrați
        if carbs < 5:
            return 0      # foarte puțini carbo
        elif carbs < 15:
            return 35     # GI scăzut
        elif carbs < 30:
            return 55     # GI mediu
        else:
            return 70     # GI ridicat
    
    def collect_food_data(self, food_name: str, romanian_name: str = None, fallback_name: str = None) -> Optional[Dict]:
        """Colectează GI + carbohidrați pentru un aliment"""
        print(f"Colectez date pentru: {food_name}")
        
        usda_data = self.search_usda_food(food_name)
        
        if not usda_data and fallback_name:
            print(f"  → Nu s-a găsit, încerc cu fallback: {fallback_name}")
            usda_data = self.search_usda_food(fallback_name)
        
        if usda_data:
            carbs = self.extract_carbs(usda_data)
            gi = self.get_gi_estimate(food_name, carbs)
            
            return {
                'name': food_name.replace('_', ' ').title(),
                'name_ro': romanian_name or food_name.replace('_', ' ').title(),
                'gi': gi,
                'carbs_per_100g': carbs
            }
        else:
            print(f"  ✗ Nu s-au găsit date pentru {food_name}")
            return None

FALLBACK_MAP = {
    'ice_cream': 'vanilla ice cream',
    'baby_back_ribs': 'pork ribs',
    'beef_carpaccio': 'beef raw',
    'beef_tartare': 'beef raw',
    'beet_salad': 'beet',
    'beignets': 'donut',
    'bibimbap': 'rice bowl',
    'bread_pudding': 'pudding',
    'breakfast_burrito': 'burrito',
    'caesar_salad': 'salad',
    'caprese_salad': 'salad mozzarella',
    'carrot_cake': 'cake',
    'cheese_plate': 'cheese',
    'chicken_quesadilla': 'quesadilla',
    'chicken_wings': 'chicken',
    'clam_chowder': 'chowder',
    'club_sandwich': 'sandwich',
    'crab_cakes': 'crab',
    'creme_brulee': 'custard',
    'croque_madame': 'sandwich',
    'cup_cakes': 'cupcake',
    'deviled_eggs': 'egg',
    'donuts': 'donut',
    'eggs_benedict': 'egg',
    'filet_mignon': 'beef steak',
    'fish_and_chips': 'fish fried',
    'foie_gras': 'liver pate',
    'french_fries': 'potato fried',
    'french_onion_soup': 'onion soup',
    'french_toast': 'toast',
    'fried_calamari': 'squid fried',
    'fried_rice': 'rice',
    'frozen_yogurt': 'yogurt',
    'garlic_bread': 'bread',
    'greek_salad': 'salad',
    'grilled_cheese_sandwich': 'cheese sandwich',
    'grilled_salmon': 'salmon',
    'hot_and_sour_soup': 'soup',
    'hot_dog': 'frankfurter',
    'huevos_rancheros': 'eggs',
    'lobster_bisque': 'bisque',
    'lobster_roll_sandwich': 'lobster',
    'macaroni_and_cheese': 'macaroni cheese',
    'pad_thai': 'noodles',
    'peking_duck': 'duck',
    'prime_rib': 'beef rib',
    'pulled_pork_sandwich': 'pork sandwich',
    'red_velvet_cake': 'chocolate cake',
    'seaweed_salad': 'seaweed',
    'shrimp_and_grits': 'shrimp',
    'spaghetti_bolognese': 'spaghetti meat sauce',
    'spaghetti_carbonara': 'spaghetti',
    'spring_rolls': 'egg roll',
    'strawberry_shortcake': 'cake',
    'tuna_tartare': 'tuna raw'
}

FOOD101_CLASSES = [
    'apple_pie', 'baby_back_ribs', 'baklava', 'beef_carpaccio', 'beef_tartare',
    'beet_salad', 'beignets', 'bibimbap', 'bread_pudding', 'breakfast_burrito',
    'bruschetta', 'caesar_salad', 'cannoli', 'caprese_salad', 'carrot_cake',
    'ceviche', 'cheese_plate', 'cheesecake', 'chicken_curry', 'chicken_quesadilla',
    'chicken_wings', 'chocolate_cake', 'chocolate_mousse', 'churros', 'clam_chowder',
    'club_sandwich', 'crab_cakes', 'creme_brulee', 'croque_madame', 'cup_cakes',
    'deviled_eggs', 'donuts', 'dumplings', 'edamame', 'eggs_benedict',
    'escargots', 'falafel', 'filet_mignon', 'fish_and_chips', 'foie_gras',
    'french_fries', 'french_onion_soup', 'french_toast', 'fried_calamari', 'fried_rice',
    'frozen_yogurt', 'garlic_bread', 'gnocchi', 'greek_salad', 'grilled_cheese_sandwich',
    'grilled_salmon', 'guacamole', 'gyoza', 'hamburger', 'hot_and_sour_soup',
    'hot_dog', 'huevos_rancheros', 'hummus', 'ice_cream', 'lasagna',
    'lobster_bisque', 'lobster_roll_sandwich', 'macaroni_and_cheese', 'macarons', 'miso_soup',
    'mussels', 'nachos', 'omelette', 'onion_rings', 'oysters',
    'pad_thai', 'paella', 'pancakes', 'panna_cotta', 'peking_duck',
    'pho', 'pizza', 'pork_chop', 'poutine', 'prime_rib',
    'pulled_pork_sandwich', 'ramen', 'ravioli', 'red_velvet_cake', 'risotto',
    'samosa', 'sashimi', 'scallops', 'seaweed_salad', 'shrimp_and_grits',
    'spaghetti_bolognese', 'spaghetti_carbonara', 'spring_rolls', 'steak', 'strawberry_shortcake',
    'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna_tartare',
    'waffles'
]

ROMANIAN_FOODS = {
    'sarmale': ('Sarmale', 'cabbage roll'),
    'mici': ('Mici', 'sausage'),
    'mamaliga': ('Mămăligă', 'polenta'),
    'cozonac': ('Cozonac', 'sweet bread'),
    'salata_boeuf': ('Salată de boeuf', 'potato salad')
}

def build_food_database(api_key: str, output_file: str = 'foods.json'):
    collector = FoodDataCollector(api_key)
    foods_db = {}
    found = []
    missing = []
    
    print("=" * 60)
    print("COLECTARE GI + CARBO PENTRU FOOD-101")
    print("=" * 60)
    
    for food in FOOD101_CLASSES:
        fallback = FALLBACK_MAP.get(food)
        food_data = collector.collect_food_data(food, fallback_name=fallback)
        
        if food_data:
            foods_db[food] = food_data
            found.append(food)
        else:
            missing.append(food)
        
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print("COLECTARE GI + CARBO PENTRU ALIMENTE ROMÂNEȘTI")
    print("=" * 60)
    
    for food_key, (romanian_name, fallback) in ROMANIAN_FOODS.items():
        food_data = collector.collect_food_data(food_key, romanian_name, fallback)
        if food_data:
            foods_db[food_key] = food_data
            found.append(food_key)
        else:
            missing.append(food_key)
        time.sleep(0.5)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(foods_db, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("RAPORT FINAL")
    print("=" * 60)
    print(f"✅ Alimente găsite: {len(found)}/{len(FOOD101_CLASSES) + len(ROMANIAN_FOODS)}")
    print(f"✗ Alimente lipsă: {len(missing)}")
    
    if missing:
        print("\n📋 Lista alimentelor lipsă:")
        for food in missing:
            print(f"  - {food}")
    
    print(f"\n💾 Baza de date salvată în: {output_file}")
    print(f"📊 Total alimente în baza de date: {len(foods_db)}")

if __name__ == "__main__":
    # Înlocuiește cu cheia ta de la USDA:
    API_KEY = "UqmJO8rlVu6iU5hDSpoCTbQeSzhnT5r7mTcdPNOc"
    
    # Citim automat toate cele 357 de clase din fișierul tău
    with open("classes.txt", "r", encoding="utf-8") as f:
        # Luăm doar numele alimentului (fără uec__ sau food101__)
        ALL_CLASSES = [line.strip().split("__")[-1].replace("_", " ") for line in f if line.strip()]
    
    # Actualizăm lista de căutare
    FOOD101_CLASSES = list(set(ALL_CLASSES))
    
    # Generăm noul fișier JSON complet
    build_food_database(API_KEY, output_file='foods_updated.json')