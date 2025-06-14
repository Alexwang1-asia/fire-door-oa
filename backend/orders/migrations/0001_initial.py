# Generated by Django 5.2.1 on 2025-05-26 06:02

import django.db.models.deletion
import orders.models
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('order_number', models.CharField(max_length=50, unique=True, verbose_name='订单号')),
                ('project_name', models.CharField(max_length=200, verbose_name='项目名称')),
                ('ordered_by', models.CharField(max_length=100, verbose_name='下单人')),
                ('order_file', models.FileField(help_text='支持PDF、Word、Excel等格式', upload_to=orders.models.order_file_path, verbose_name='下料单文件')),
                ('production_sheet', models.FileField(blank=True, help_text='技术员上传的生产面单文件', null=True, upload_to=orders.models.production_sheet_path, verbose_name='生产面单')),
                ('status', models.CharField(choices=[('pending', '待审核'), ('approved', '已批准'), ('rejected', '已拒绝'), ('in_production', '生产中'), ('completed', '已完成')], default='pending', max_length=20, verbose_name='状态')),
                ('review_date', models.DateTimeField(blank=True, null=True, verbose_name='审核时间')),
                ('review_notes', models.TextField(blank=True, verbose_name='审核意见')),
                ('production_started_at', models.DateTimeField(blank=True, null=True, verbose_name='开始生产时间')),
                ('production_notes', models.TextField(blank=True, verbose_name='生产备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('production_started_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='started_production_orders', to=settings.AUTH_USER_MODEL, verbose_name='开始生产操作人')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_orders', to=settings.AUTH_USER_MODEL, verbose_name='审核人')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='创建用户')),
            ],
            options={
                'verbose_name': '订单',
                'verbose_name_plural': '订单',
                'ordering': ['-created_at'],
            },
        ),
    ]
