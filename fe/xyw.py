from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/robot-data")
async def receive_data(request: Request):
    try:
        # Nhận raw body (có thể là JSON hoặc form-data)
        data = await request.json()
    except Exception:
        # Nếu không phải JSON thì lấy raw text
        data = await request.body()
        data = data.decode("utf-8")
    print("📩 Received data:", data)

@app.post("/alarm-data")
async def receive_alarm_data(request: Request):
    try:
        # Nhận raw body (có thể là JSON hoặc form-data)
        data = await request.json()
    except Exception:
        # Nếu không phải JSON thì lấy raw text
        data = await request.body()
        data = data.decode("utf-8")

    print("📩 Received alarm data:", data)


@app.post("/caller-data")
async def receive_caller_data(request: Request):
    try:
        # Nhận raw body (có thể là JSON hoặc form-data)
        data = await request.json()
    except Exception:
        # Nếu không phải JSON thì lấy raw text
        data = await request.body()
        data = data.decode("utf-8")

    print("📩 Received caller data:", data)

    return JSONResponse(content={
        "status": "success",
        "received": data
    })
