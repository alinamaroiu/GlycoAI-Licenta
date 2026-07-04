import json

with open("foods_updated.json", "r", encoding="utf-8") as f:
    db = json.load(f)

print(f"Total alimente: {len(db)}")
print(f"Există 'pizza' exact? {'pizza' in db}")

# Vedem primele 10 chei ca să înțelegem formatul
print("Primele 10 chei din JSON:")
print(list(db.keys())[:10])

# Căutăm orice conține 'pizza'
pizza_keys = [k for k in db.keys() if 'pizza' in k.lower()]
print(f"Chei care conțin 'pizza': {pizza_keys}")