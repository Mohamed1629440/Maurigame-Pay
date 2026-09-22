-- v33 : Restreindre l'acces anon sur payment_intents
-- Probleme : "anon read intent by ref" avec USING (true) permettait a n'importe qui
-- de lire TOUS les champs de TOUS les intents (y.c. expected_phone, sms_received, etc.)
-- Fix : on supprime la policy et on passe par une fonction SECURITY DEFINER
-- qui n'expose que les champs publics necessaires a la page de paiement.

-- 1. Supprimer la policy permissive
DROP POLICY IF EXISTS "anon read intent by ref" ON payment_intents;

-- 2. Fonction publique : retourne uniquement les champs non-sensibles d'un intent
CREATE OR REPLACE FUNCTION get_intent_public(p_ref text)
RETURNS TABLE (
  ref         text,
  status      text,
  expires_at  timestamptz,
  amount      integer,
  method      text,
  description text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ref,
    status,
    expires_at,
    amount,
    method,
    description
  FROM payment_intents
  WHERE payment_intents.ref = p_ref;
$$;

-- Accessible aux anonymes
GRANT EXECUTE ON FUNCTION get_intent_public(text) TO anon, authenticated;
