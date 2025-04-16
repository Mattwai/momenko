import firebase_admin
from firebase_admin import credentials
cred = credentials.Certificate("env/momenko_firebase.json")
firebase_admin.initialize_app(cred)
print(firebase_admin.get_app())