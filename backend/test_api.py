import requests
import json

response = requests.post(
    "http://localhost:8000/api/query",
    json={"prompt": "Show me the average online spend by gender"}
)
print("Status Code:", response.status_code)
print("Response JSON:", json.dumps(response.json(), indent=2))
