import asyncio
import json
import websockets

CLIENTS = set()


async def broadcast(message: dict):
    if not CLIENTS:
        return

    payload = json.dumps(message)
    dead_clients = []

    for client in list(CLIENTS):
        try:
            await client.send(payload)
        except Exception as e:
            print("Broadcast send failed:", e)
            dead_clients.append(client)

    for client in dead_clients:
        CLIENTS.discard(client)


async def handler(websocket):
    CLIENTS.add(websocket)
    print("Client connected")

    try:
        async for message in websocket:
            print("Received from client:", message)

            try:
                parsed = json.loads(message)
                if parsed.get("source") in ("gesture", "speech"):
                    await broadcast(parsed)
            except Exception as e:
                print("Bad incoming JSON:", e)

    except Exception as e:
        print("Client error:", e)

    finally:
        CLIENTS.discard(websocket)
        print("Client disconnected")


async def main():
    server = await websockets.serve(
        handler,
        "0.0.0.0",
        8080,
        ping_interval=30,
        ping_timeout=30,
    )
    print("WebSocket server running on ws://0.0.0.0:8080")
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())


