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
    User ->> SIOClient: Enters message
    SIOClient ->> SIOServer: Emit message
    SIOServer ->> CeleryClient: Receive message, create task message
    CeleryClient ->> CeleryRedisBroker: Send task message (process_message)
    CeleryRedisBroker ->> CeleryWorker: Receive task message and run process_message
    loop Until Response message
        CeleryWorker ->> RedisChannel: Publish status message (task_worker_messages)
        RedisChannel ->> TaskSubscriber: Receive status message (task_worker_messages)
        TaskSubscriber ->> SIOServer: Emit status message
        SIOServer ->> SIOClient: Receive status message
        SIOClient ->> User: View status message
        CeleryWorker ->> RedisChannel: Publish response message (task_worker_messages)
        RedisChannel ->> TaskSubscriber: Receive response message (task_worker_messages)
        TaskSubscriber ->> SIOServer: Emit response message
        SIOServer ->> SIOClient: Receive response message
        SIOClient ->> User: View response message
    end

```

The above diagram does not include internal Redis interaction between SIOServer and Celery components.

* SIOClient  - SocketIO Client
* SIOServer - SocketIO Server
* TaskSubscriber - listener within the SocketIO Server
