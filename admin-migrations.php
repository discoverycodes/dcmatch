<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: create_transactions_table.php
return new class extends Migration
{
    public function up()
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['deposit', 'withdrawal', 'payout', 'refund']);
            $table->decimal('amount', 15, 8);
            $table->string('currency', 10)->default('BRL');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected'])->default('pending');
            $table->enum('payment_method', ['pix', 'usdt_bep20', 'bank_transfer'])->nullable();
            $table->string('payment_id')->nullable();
            $table->string('wallet_address')->nullable();
            $table->string('pix_key')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users');
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'type']);
            $table->index(['status', 'created_at']);
            $table->index('payment_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('transactions');
    }
};

// Migration: create_admin_logs_table.php
class CreateAdminLogsTable extends Migration
{
    public function up()
    {
        Schema::create('admin_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->onDelete('cascade');
            $table->string('action');
            $table->string('target_type')->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->ipAddress();
            $table->text('user_agent')->nullable();
            $table->timestamps();
            
            $table->index(['admin_id', 'created_at']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('admin_logs');
    }
}

// Migration: create_system_settings_table.php
class CreateSystemSettingsTable extends Migration
{
    public function up()
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->enum('type', ['string', 'number', 'boolean', 'json'])->default('string');
            $table->text('description')->nullable();
            $table->timestamps();
        });
        
        // Insert default settings
        $defaultSettings = [
            ['key' => 'min_bet', 'value' => 1, 'type' => 'number', 'description' => 'Aposta mínima permitida'],
            ['key' => 'max_bet', 'value' => 1000, 'type' => 'number', 'description' => 'Aposta máxima permitida'],
            ['key' => 'win_multiplier', 'value' => 2, 'type' => 'number', 'description' => 'Multiplicador de vitória'],
            ['key' => 'game_time_limit', 'value' => 60, 'type' => 'number', 'description' => 'Tempo limite do jogo (segundos)'],
            ['key' => 'game_move_limit', 'value' => 100, 'type' => 'number', 'description' => 'Limite de movimentos do jogo'],
            ['key' => 'min_withdrawal', 'value' => 10, 'type' => 'number', 'description' => 'Saque mínimo'],
            ['key' => 'max_withdrawal', 'value' => 10000, 'type' => 'number', 'description' => 'Saque máximo'],
            ['key' => 'house_edge_target', 'value' => 5, 'type' => 'number', 'description' => 'Meta de house edge (%)'],
            ['key' => 'maintenance_mode', 'value' => false, 'type' => 'boolean', 'description' => 'Modo manutenção'],
            ['key' => 'registration_enabled', 'value' => true, 'type' => 'boolean', 'description' => 'Registro habilitado'],
        ];
        
        DB::table('system_settings')->insert($defaultSettings);
    }

    public function down()
    {
        Schema::dropIfExists('system_settings');
    }
}

// Migration: create_payment_methods_table.php
class CreatePaymentMethodsTable extends Migration
{
    public function up()
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['crypto', 'pix', 'bank']);
            $table->string('provider'); // plisio, primepag
            $table->string('currency', 10);
            $table->boolean('is_active')->default(true);
            $table->decimal('min_amount', 15, 8);
            $table->decimal('max_amount', 15, 8);
            $table->decimal('fee_percentage', 5, 4)->default(0);
            $table->decimal('fee_fixed', 15, 8)->default(0);
            $table->json('config')->nullable();
            $table->timestamps();
        });
        
        // Insert default payment methods
        $paymentMethods = [
            [
                'name' => 'PIX',
                'type' => 'pix',
                'provider' => 'primepag',
                'currency' => 'BRL',
                'min_amount' => 10,
                'max_amount' => 50000,
                'fee_percentage' => 2.5,
                'config' => json_encode(['instant' => true])
            ],
            [
                'name' => 'USDT BEP-20',
                'type' => 'crypto',
                'provider' => 'plisio',
                'currency' => 'USDT',
                'min_amount' => 5,
                'max_amount' => 100000,
                'fee_percentage' => 1.0,
                'config' => json_encode(['network' => 'BEP20', 'confirmations' => 3])
            ]
        ];
        
        DB::table('payment_methods')->insert($paymentMethods);
    }

    public function down()
    {
        Schema::dropIfExists('payment_methods');
    }
}

// Migration: create_security_logs_table.php
class CreateSecurityLogsTable extends Migration
{
    public function up()
    {
        Schema::create('security_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('event_type');
            $table->ipAddress();
            $table->text('user_agent')->nullable();
            $table->string('country', 2)->nullable();
            $table->json('details')->nullable();
            $table->integer('risk_score')->default(0);
            $table->timestamps();
            
            $table->index(['user_id', 'event_type']);
            $table->index(['risk_score', 'created_at']);
            $table->index('ip_address');
        });
    }

    public function down()
    {
        Schema::dropIfExists('security_logs');
    }
}

// Migration: add_admin_fields_to_users_table.php
class AddAdminFieldsToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('status', ['active', 'inactive', 'suspended', 'banned'])->default('active');
            $table->boolean('is_admin')->default(false);
            $table->enum('kyc_status', ['not_submitted', 'pending', 'approved', 'rejected'])->default('not_submitted');
            $table->json('kyc_documents')->nullable();
            $table->timestamp('last_activity')->nullable();
            $table->string('two_factor_secret')->nullable();
            $table->boolean('two_factor_enabled')->default(false);
            $table->string('phone')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('document_number')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->default('BR');
            $table->string('postal_code')->nullable();
            $table->json('preferences')->nullable();
            
            $table->index(['status', 'is_admin']);
            $table->index('kyc_status');
            $table->index('last_activity');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'status', 'is_admin', 'kyc_status', 'kyc_documents',
                'last_activity', 'two_factor_secret', 'two_factor_enabled',
                'phone', 'birth_date', 'document_number', 'address',
                'city', 'state', 'country', 'postal_code', 'preferences'
            ]);
        });
    }
}

// Migration: create_api_keys_table.php
class CreateApiKeysTable extends Migration
{
    public function up()
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('provider'); // plisio, primepag
            $table->string('key_name');
            $table->text('key_value');
            $table->boolean('is_active')->default(true);
            $table->json('permissions')->nullable();
            $table->timestamp('last_used')->nullable();
            $table->timestamps();
            
            $table->index(['provider', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('api_keys');
    }
}