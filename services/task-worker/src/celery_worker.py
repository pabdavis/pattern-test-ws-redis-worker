from celery import Celery
from redis import Redis
import os
import json
import time
import logging as logger

logger.basicConfig(level=logger.INFO)


redis_host = os.getenv('REDIS_HOST', 'redis')
redis_port = os.getenv('REDIS_PORT', 6379)
redis_db = os.getenv('REDIS_DB', 0)
# Define the Celery application
redis_url = f'redis://{redis_host}:{redis_port}/{redis_db}'
app = Celery(
    'tasks',
    backend=redis_url,
    broker=redis_url
)

# Define a Celery task
@app.task
def process_message(message):
    logger.info('Processing message: %s', message)
    message = json.loads(message)
    # Process the message (example: increment the message)
    get_answer(message)


def get_answer(message):
    logger.info('Processing message: %s', message)
    target_channel = 'task_worker_messages'
    redis_client = Redis(host=redis_host, port=redis_port, db=redis_db)

    sid = message.get('sid')

    update_message = {
        "sid": sid,
        "message": "Working on your request, please wait..."
    }
    logger.info('Update message: %s', update_message)
    redis_client.publish(target_channel, json.dumps(update_message))
    time.sleep(10)

    update_message = {
        "sid": sid,
        "message": "Update #2 using an additional source."
    }
    logger.info('Update message: %s', update_message)
    redis_client.publish(target_channel, json.dumps(update_message))
    time.sleep(10)

    complete_message = {
        "sid": sid,
        "message": "Final answer is yes"
    }
    logger.info('Update message: %s', complete_message)
    redis_client.publish(target_channel, json.dumps(complete_message))

    return message

    # Publish the incremented message back to a Redis channel
    # redis_client = Redis(host=redis_host, port=redis_port, db=redis_db)
    # redis_client.publish('incremented_messages', incremented_message)

# def start_worker():
#     logger.info('Starting the Celery worker')
#     # Connect to Redis
#     redis_client = Redis(host=redis_host, port=redis_port, db=redis_db)
#     logger.info(f'Connected to Redis ({redis_host}:{redis_port}/{redis_db})')

#     # Subscribe to the 'chat_messages' channel
#     pubsub = redis_client.pubsub()
#     pubsub.subscribe('chat_messages')

#     # Listen for messages and process them using the Celery task
#     for message in pubsub.listen():
#         logger.info('Received message: %s', message)
#         if message['type'] == 'message':
#             message_data = json.loads(message['data'])
#             get_answer(message_data)
#             process_message.delay(message_data)  # Dispatch Celery task


if __name__ == "__main__":
    argv = [
        'worker',
        '--loglevel=DEBUG',
        '--concurrency=4'
    ]
    app.worker_main(argv)