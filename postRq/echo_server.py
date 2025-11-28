from http.server import HTTPServer, BaseHTTPRequestHandler
import logging

class EchoHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        print("\n\n=== NHẬN ĐƯỢC REQUEST MỚI ===")
        # 1. In Headers
        print("--- HEADERS ---")
        print(self.headers)
        
        # 2. In Body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        print("--- BODY (RAW) ---")
        print(body)
        
        print("--- BODY (HEX) ---")
        print(body.hex())
        
        # Trả về Fake Success để client vui
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"code": 1000, "message": "Fake Success"}')

print("Đang chạy Echo Server tại port 8888...")
HTTPServer(('0.0.0.0', 8888), EchoHandler).serve_forever()