from services import db_service, gemini_service
import asyncio

db_service.init_db("../dataset.csv")
config = gemini_service.generate_dashboard_config("Show me the average online spend by gender")
print(config)
sql = config["sql"]
print(f"SQL: {sql}")
res = db_service.execute_query(sql)
print(res)
