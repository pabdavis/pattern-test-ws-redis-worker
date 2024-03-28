# Start the servers

```sh
docker-compose build
docker-compose up
```

# virtual env setup

```sh
python3 -m venv .venv
source ./.venv/bin/activate

pip3 install -r requirements.txt
```

# Communicate through socket.io

```sh
python3
import socketio
sio = socketio.SimpleClient()
sio.connect('<http://localhost:3000>')
sio.emit('chat message', {"test": "TEST"})
```

```mermaid
sequenceDiagram
    Web ->> Socket.io: Emit
    Socket.io ->> CeleryClient: SendTask (process_message)
    CeleryClient ->> CeleryRedisBroker: Publish
    CeleryRedisBroker ->> CeleryWorker: Run Task (process_message)
    CeleryWorker ->> RedisChannel: Publish increment message (task_worker_messages)
    RedisChannel ->> TaskSubcriber: Receive message
    TaskSubcriber ->> Socket.io: Emit message
    Socket.io ->> Web: Receive message
```
