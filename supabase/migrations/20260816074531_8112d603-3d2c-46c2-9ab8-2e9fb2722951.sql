DROP POLICY IF EXISTS "Users manage own notif prefs" ON public.notification_preferences;

CREATE POLICY "Users select own notif prefs" ON public.notification_preferences
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own notif prefs" ON public.notification_preferences
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own notif prefs" ON public.notification_preferences
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notif prefs" ON public.notification_preferences
FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.notification_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;