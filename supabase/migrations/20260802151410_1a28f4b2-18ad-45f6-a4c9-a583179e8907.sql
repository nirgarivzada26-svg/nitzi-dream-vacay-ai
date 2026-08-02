INSERT INTO public.system_settings (key, value, is_public) VALUES
 ('company_profile', '{"business_name":"","tax_id":"","address":"","support_email":"","support_phone":"","refund_contact":"","legal_contact":""}'::jsonb, true),
 ('settlement_currency', '"ILS"'::jsonb, false),
 ('email_sender_domain', '""'::jsonb, false),
 ('backup_policy', '{"last_backup_at":null,"last_restore_test_at":null,"dr_procedure":"","secrets_backup_at":null,"provider_credentials_backup_at":null}'::jsonb, false),
 ('alert_thresholds', '{"provider_failure_rate":0.1,"failed_payments":3,"failed_bookings":3,"failed_webhooks":3,"api_errors":25,"ai_errors":10,"app_errors":25,"window_hours":24}'::jsonb, false),
 ('security_review', '{"reviewed_at":null,"open_critical":null,"open_high":null,"two_factor_ready":false,"session_max_hours":24,"reviewer":""}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;