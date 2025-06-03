web: cd backend && gunicorn fire_door_oa.wsgi:application --bind 0.0.0.0:$PORT
release: cd backend && python manage.py migrate && python manage.py collectstatic --noinput