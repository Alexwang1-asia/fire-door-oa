from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import orders.models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', '待审核'),
                    ('approved', '已批准'),
                    ('rejected', '已拒绝'),
                    ('in_production', '生产中'),
                    ('in_warehouse', '已入库'),
                    ('out_warehouse', '已出库'),
                    ('completed', '已完成'),
                ],
                default='pending',
                max_length=20,
                verbose_name='状态'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='inbound_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='inbound_orders',
                to=settings.AUTH_USER_MODEL,
                verbose_name='入库操作人'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='inbound_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='入库时间'),
        ),
        migrations.AddField(
            model_name='order',
            name='outbound_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='outbound_orders',
                to=settings.AUTH_USER_MODEL,
                verbose_name='出库操作人'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='outbound_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='出库时间'),
        ),
        migrations.AddField(
            model_name='order',
            name='outbound_file',
            field=models.FileField(
                blank=True,
                help_text='出入库员上传的出库单文件',
                null=True,
                upload_to=orders.models.outbound_file_path,
                verbose_name='出库单文件'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='outbound_notes',
            field=models.TextField(blank=True, verbose_name='出库备注'),
        ),
    ]