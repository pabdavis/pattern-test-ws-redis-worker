from celery import Celery

# Define the Celery application
app = Celery('tasks', broker='redis://redis:6379/0')

# Define a Celery task
@app.task
def add(x, y):
    return x + y
