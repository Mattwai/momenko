from transformers import pipeline
chatbot = pipeline("text-generation", model="distilgpt2")
print(chatbot("Hello!", max_length=20))