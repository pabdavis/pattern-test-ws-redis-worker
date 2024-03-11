from celery import Celery
from redis import Redis
import os
import json
import logging as logger

logger.basicConfig(level=logger.INFO)


redis_host = os.getenv('REDIS_HOST', 'redis')
redis_port = os.getenv('REDIS_PORT', 6379)
redis_db = os.getenv('REDIS_DB', 0)
# Define the Celery application
app = Celery('tasks', broker=f'redis://{redis_host}:{redis_port}/{redis_db}')

# Define a Celery task
@app.task
def process_message(message):
    #logger.info('Processing message: %s', message)

    # Process the message (example: increment the message)
    incremented_message = message + 1

    # Publish the incremented message back to a Redis channel
    redis_client = Redis(host=redis_host, port=redis_port, db=redis_db)
    redis_client.publish('incremented_messages', incremented_message)


def start_worker():
    logger.info('Starting the Celery worker')
    # Connect to Redis
    redis_client = Redis(host=redis_host, port=redis_port, db=redis_db)
    logger.info(f'Connected to Redis ({redis_host}:{redis_port}/{redis_db})')

    # Subscribe to the 'chat_messages' channel
    pubsub = redis_client.pubsub()
    pubsub.subscribe('chat_messages')

    # Listen for messages and process them using the Celery task
    for message in pubsub.listen():
        logger.info('Received message: %s', message)
        if message['type'] == 'message':
            message_data = json.loads(message['data'])
            process_message.delay(message_data)  # Dispatch Celery task


if __name__ == "__main__":
    start_worker()