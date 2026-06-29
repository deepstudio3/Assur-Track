# Post-Mortem : Analyse de la Crise du QR Code

## Résumé Exécutif

Ce document synthétise l'enquête approfondie menée pour résoudre un problème critique : la génération systématique d'un QR code de remplacement (pixel 8x8) au lieu d'un QR code fonctionnel pour les sessions WhatsApp. L'investigation a révélé une cascade de défaillances à plusieurs niveaux de l'infrastructure, de la configuration Docker à la gestion des dépendances du moteur.

---

## Chronologie de l'Enquête et des Actions

### Phase 1 : Hypothèses Initiales (Couche Applicative)

**Symptôme Initial :** L'API retournait immédiatement un QR code de 89 octets, visible mais non scannable, au lieu d'un QR code WhatsApp fonctionnel.

**Contexte du Débogage :**
- Le script de test `create_new_session_qr.py` était utilisé pour valider la création de session
- Les logs de l'API ne montraient aucune erreur explicite
- Le QR code était généré quasi-instantanément, ce qui semblait anormal pour un processus WhatsApp

**Actions Menées :**
1.  **Modification de l'endpoint `create_session` :** 
    - **Fichier :** `app/api/v1/endpoints/sessions.py`
    - **Action :** Forcé le passage de l'endpoint en mode synchrone (`await session_manager.create_session(...)`)
    - **Objectif :** Garantir que l'API n'ait pas lieu avant la génération réelle du QR code par le `SessionManager`
    - **Résultat :** Aucun changement, le QR code de remplacement persistait

2.  **Analyse des logs de l'API :**
    - **Observation :** Le processus de création de session était bien lancé
    - **Problème :** Absence totale de logs de suivi de la part du `SessionManager`
    - **Conclusion :** Le problème se situait plus en aval, dans la couche service

**Découverte Annexe :** Correction d'une erreur récurrente `UnboundLocalError` dans le script de test due à une importation incorrecte du module `time`.

**Conclusion de Phase 1 :** Le problème n'était pas un simple défaut d'asynchronisme dans l'API. La cause se situait au niveau du `SessionManager`.

---

### Phase 2 : Plongée dans le Service (SessionManager)

**Symptôme :** Le `SessionManager` semblait échouer silencieusement.

**Actions Menées :**
1.  **Ajout de logs de diagnostic :** Insertion de messages à chaque étape critique du `SessionManager` (vérification Redis, allocation de port, création de conteneur).
2.  **Découverte d'un bug critique :** Un `logger.info()` tentait de formater un dictionnaire (`self.session_ports`), provoquant une exception interne au module `logging` qui interrompait brutalement le flux d'exécution.
3.  **Correction du bug :** Suppression de la partie problématique du message de log.

**Conclusion :** Un bug réel a été identifié et corrigé, mais le symptôme principal (QR code de remplacement) persistait.

---

### Phase 3 : Audit de l'Infrastructure Docker

**Symptôme :** Les logs des conteneurs de session étaient minimalistes (`WhatsApp Engine running on port...`), sans trace d'OpenWA ou de Puppeteer.

**Actions Menées :**
1.  **Inspection des `Dockerfile` :** Découverte de deux fichiers : `Dockerfile.real` (véritable moteur OpenWA avec Chromium) et `Dockerfile.simple` (serveur Node.js factice).
2.  **Analyse du `docker-compose.yml` :** **LA RÉVÉLATION** : Aucun service n'était défini pour construire l'image `whatsapp-openwa-engine:latest`. Le système utilisait une ancienne image "fantôme" en cache, construite à partir du `Dockerfile.simple`.
3.  **Correction de la configuration :** Ajout d'un service `whatsapp-engine` dans `docker-compose.yml` pointant vers le bon `Dockerfile`.
4.  **Nettoyage forcé :** Suppression de l'image fantôme (`docker rmi -f`) pour forcer une reconstruction propre.

**Conclusion :** La cause racine la plus profonde a été identifiée. L'infrastructure ne construisait jamais le bon moteur.

---

### Phase 4 : La Dernière Ligne de Front (Moteur OpenWA)

**Symptôme :** Même après la reconstruction, le QR code de remplacement persistait.

**Actions Menées :**
1.  **Construction isolée et observation :** `docker-compose build --no-cache whatsapp-engine` a confirmé une construction réelle (24 minutes, installation de Chromium et des dépendances npm).
2.  **Inspection des logs du conteneur de session :** **LA VÉRITÉ FINALE** : Le moteur plantait immédiatement avec l'erreur `Error: Cannot find module 'dotenv'`.
3.  **Analyse de la cause :** Le module `dotenv` était listé dans `devDependencies` du `package.json`, mais le `Dockerfile` exécutait `npm install` (qui n'installe que les `dependencies` par défaut). Le code source du moteur, lui, nécessitait `dotenv` pour démarrer.
4.  **Correction finale :** Déplacement de `dotenv` de `devDependencies` à `dependencies` dans `package.json`.

---

## Synthèse des Problèmes Rencontrés

| Niveau | Problème | Impact | Solution |
| --- | --- | --- | --- |
| **Applicatif** | Endpoint potentiellement asynchrone | Retour trop rapide du QR | Forçage de l'attente (`await`) |
| **Service** | Exception silencieuse dans le `SessionManager` | Arrêt du flux de création | Correction du log |
| **Infrastructure** | `docker-compose.yml` ne construisait pas l'image | Utilisation d'un moteur factice | Ajout du service `whatsapp-engine` |
| **Moteur** | Dépendance `dotenv` manquante en production | Crash au démarrage du conteneur | Déplacement dans `dependencies` |
| **Test** | Erreur `UnboundLocalError` dans le script | Échec de l'exécution du test | Import global du module `time` |

---

## Leçons Apprises

1.  **Confiance Zéro :** Ne jamais supposer qu'une image Docker est à jour. Toujours vérifier les logs de construction et les dépendances.
2.  **L'Infrastructure est Code :** Une erreur dans un fichier `docker-compose.yml` peut avoir des conséquences invisibles pendant des mois.
3.  **La Visibilité est Reine :** Sans logs détaillés à chaque couche, un problème d'infrastructure peut être confondu avec un bug applicatif.
4.  **Les Dépendances ont un Contexte :** Une `devDependency` en local peut devenir une `dependency` critique dans un conteneur.

---

## État Actuel et Prochaines Étapes

**État :** Toutes les causes racines identifiées ont été corrigées. L'infrastructure est maintenant théoriquement saine.

**Prochaines Étapes :**
1.  Relancer une reconstruction complète de l'image `whatsapp-openwa-engine` pour appliquer la correction `dotenv`.
2.  Exécuter le script de test `create_new_session_qr.py`.
3.  Valider qu'un QR code réel, scannable, est bien généré et que la session passe à l'état `connected`.

---

## Conclusion

Cette enquête illustre comment une défaillance initiale (un simple QR code incorrect) peut être le symptôme d'une chaîne complexe de défaillances systémiques. La méthode d'investigation par couches successives, bien que longue, a été nécessaire pour remonter jusqu'à la cause racine. Le système est désormais plus robuste et mieux compris.
