# GaragePro — Système de gestion pour garage automobile

Application web complète (React + TypeScript + Vite + Tailwind CSS + Supabase) pensée pour les
garages tunisiens : réception de véhicules, suivi d'atelier, devis/factures, stock de pièces,
rapports, contact client par WhatsApp. Interface en **français**, montant en **dinars tunisiens (TND)**.

---

## 1. Fonctionnalités

| Page | Description |
|---|---|
| **Connecter** | Création de compte / connexion (Supabase Auth). Aucune session simulée : sans Supabase configuré, l'application affiche un message explicite. |
| **Tableau de bord** | Statistiques du jour (voitures en atelier, en attente de pièces, factures impayées, revenus réels calculés sur les paiements enregistrés — zéro donnée fictive). |
| **Réception** | Enregistrement d'un nouveau véhicule : client (existants ou nouveau), marque, couleur, plaque, VIN, kilométrage, panne déclarée, photos (URL), mécanicien assigné. Numéro automatique `GAR-AAAA-NNNN`. |
| **En maintenance** | Liste des véhicules en cours + fiche détail : changement d'état (réceptionné → diagnostic → devis à valider → attente pièces → en réparation → tests → terminé), ajout de tâches / main-d'œuvre, pièces utilisées (impactent le stock), historique d'états, note d'atelier. |
| **Véhicules terminés** | Voitures prêtes ou livrées, PV de sortie, contact WhatsApp en un clic. |
| **Clients & véhicules** | Liste et fiches détaillées (coordonnées, historique de réparations, WhatsApp `wa.me` normalisé +216). |
| **Factures** | Création d'un devis ou une facture à partir d'une réparation (totaux calculés : main-d'œuvre + pièces + frais annexes − remise), encaissements partiels, impression A4. |
| **Stock pièces** | Pièces de rechange, seuil d'alerte, ajustement de stock, mouvements tracés, export CSV. |
| **Rapports** | Statistiques sur une période (reçus, livrés, revenus, encaissements) — uniquement à partir des données réelles. Export CSV. |
| **Paramètres** (admin) | Nom du garage, logo (URL), coordonnées, préfixes de numéros, opérateurs et leurs rôles. Les couleurs du thème se modifient dans `src/index.css`. |

Workflow des états : `received → awaiting_diagnosis → awaiting_approval → awaiting_parts → under_repair → testing → finished`.

---

## 2. Architecture

```
garagepro/
├── .env.example          ← variables d'environnement à copier vers .env
├── index.html
├── supabase/
│   ├── schema.sql        ← 12 tables, RLS, index, fonction next_job_number (à exécuter dans Supabase)
│   └── seed.demo.sql     ← jeu de démonstration RÉALISTE (à n'utiliser qu'en mode démo; clairement marqué)
├── src/
│   ├── components/ui/     ← boutons, cartes, badges, dialog, toaster
│   ├── components/layout/ ← Sidebar + TopBar + Layout
│   ├── contexts/          ← AuthContext (session + profil + rôle)
│   ├── lib/               ← supabase.ts, db.ts (accès données), currency.ts, whatsapp.ts, i18n.ts, utils.ts
│   ├── pages/             ← Login, Dashboard, RegisterCar, Maintenance, FinishedCars,
│   │                        CarDetail, Customers, CustomerDetail, Invoices, InvoicePrint,
│   │                        PartsStock, Reports, Settings
│   └── types/             ← types miroir du schéma PostgreSQL
└── vite.config.ts
```

Règle importante : **l'application n'invente aucune donnée**. Toutes les statistiques, factures et
paiements proviennent de la base PostgreSQL : tant que rien n'est saisi, les compteurs affichent 0.
Le fichier `seed.demo.sql` est le seul jeu de données fictif et il est explicitement marqué « démo ».

---

## 3. Installation

### a) Base de données Supabase (≈ 5 minutes)

1. Créez un projet gratuit sur [supabase.com](https://supabase.com).
2. Ouvrez **SQL Editor → New query**, copiez-collez tout le contenu de
   `supabase/schema.sql` puis **Run**. Cela crée :
   - les 12 tables (profils, clients, véhicules, réparations, tâches, pièces, factures, paiements…),
   - les politiques de sécurité **RLS**,
   - la fonction `next_job_number`,
   - le **déclencheur** qui crée automatiquement la ligne `profiles` à chaque inscription
     (rôle par défaut : `receptionist` — devenez `administrator` via un UPDATE, voir §5).
3. (Optionnel, mode démo uniquement) Exécutez `supabase/seed.demo.sql` dans le SQL Editor.

### b) Configuration de l'application

```powershell
cd garagepro
npm install
Copy-Item .env.example .env
```

Éditez `.env` avec les valeurs du tableau de bord Supabase → **Project Settings → API** :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   # clé *anon* publique (la sécurité est garantie par RLS)
```

> ⚠️ La clé *anon* va dans le navigateur : ne mettez **jamais** la clé `service_role` dans `.env`.
> Les liste blanche d'URLs (Auth → URL Configuration) doivent contenir `http://localhost:5173`.

### c) Lancer

```powershell
npm run dev      # http://localhost:5173
npm run build    # vérfication TypeScript + bundle production → dist/
npm run preview  # prévisualiser le build de production
```

Premier lancement : la page de connexion affiche « Supabase non configuré » tant que `.env`
n'est pas rempli — c'est un comportement voulu, jamais de session simulée.

---

## 4. Créer le premier compte administrateur

1. Sur la page de connexion, choisissez **Créer un compte** (mode signup) et inscrivez-vous.
2. (Selon la configuration Supabase, confirmez l'email si demandé.)
3. Le déclencheur SQL crée le profil avec le rôle `receptionist`. Se il n'a pas encore accès
   à tout, donnez-vous le rôle administrateur dans le SQL Editor :

```sql
update public.profiles set role = 'administrator' where email = 'vous@garage.tn';
```

Rôles disponibles : `administrator`, `mechanic`, `receptionist`.
La page **Paramètres** (réservée aux admins) permet ensuite de gérer les opérateurs.

---

## 5. Personnaliser le garage

- **Nom, téléphone, adresse, logo, pied de facture, préfixes de numéros** :
  page **Paramètres** intégrée (stockés dans la table `garage_settings`).
- **Couleurs / thème** : variables dans `src/index.css` (bloc `@theme`) — `garage-orange`,
  `garage-bg`, `garage-text`, etc. Changez la valeur hexadécimale, tout le thème suit.
- **Logo** : l'URL définie dans Paramètres est utilisée par la sidebar et l'impression de facture.
- **Traductions** : `src/lib/i18n.ts` (dictionnaire `fr` complet ; `ar` / `en` déjà branchés,
  prêts à remplir).

---

## 6. Fonctionnalités nécessitant un service externe (documenté, non simulé)

| Fonctionnalité | Service | Comment activer |
|---|---|---|
| WhatsApp | [wa.me](https://wa.me) | Automatique, aucun compte requis — normalisation du numéro tunisien intégrée. |
| Emails transactionnels | Supabase Auth | Aucun réglage ; désactivez la confirmation email si besoin (Auth → Suppliers → Email). |
| Sauvegarde de la base | Supabase | Dashboard → Database → Backups (plan gratuit limité) ; ou `supabase db dump` via CLI. |
| Photos des véhicules | Stockage fichiers | Le champ `photos` accepte des URLs. Pour un hébergement d'images, activez Supabase Storage (bucket `vehicle-photos`, à documenter dans le schéma). |
| Export comptable | CSV | Bouton intégré (Comma, encodage UTF-8). |

Ces intégrations **ne sont pas simulées** : tant que le service n'est pas configuré,
la fonctionnalité reste informe (boutons désactivés ou message explicite).

---

## 7. Sauvegarde & restauration

```powershell
# Export complet via Supabase CLI
npx supabase db dump -f backup.sql

# Restauration sur un nouveau projet
npx supabase db execute -f backup.sql
```

Vérifiez aussi le tableau de bord Supabase → **Database → Backups** (activé par défaut).

---

## 8. Liste de recette (QA)

Comptes/rôles :
- [ ] Inscription impossible sans Supabase configuré (message visible, pas de crash).
- [ ] Signup → profil créé par trigger ; rôle `receptionist` par défaut ; pas d'accès aux Paramètres.
- [ ] Admin voit tout ; mécanicien voit l'atelier ; réceptionniste voit accueil/factures.

Données :
- [ ] Créer client → véhicule → réception : le numéro `GAR-2026-0001` apparaît.
- [ ] Le tableau de bord reflète exactement les données saisies (0 si base vide).
- [ ] Ajouter une tâche + une pièce : le total de la réparation augmente d'autant.
- [ ] La pièce utilisée décrémente le stock et crée un mouvement.
- [ ] Passer par tous les états ; le véhicule apparaît dans les colonnes correspondantes.
- [ ] Terminer + livrer → visible dans « Véhicules terminés », PV imprimable, bouton WhatsApp.
- [ ] Créer une facture → numéro `FACT-2026-0001`, encaissement partiel → solde correct.
- [ ] Imprimer la facture A4 (logo + conditions + totaux).
- [ ] Stock : seuil bas → badge « Bas » ; ajustement tracé dans les mouvements.
- [ ] Rapports sur une période → chiffres cohérents avec les paiements réels ; export CSV.
- [ ] Paramètres : changer le nom du garage → la sidebar et les factures le reflètent.

Build :
- [ ] `npm run build` termine sans erreur (lancement de vérification).
- [ ] `npm run dev` accessible sur http://localhost:5173.

---

## 9. Déploiement

1. `npm run build` → dossier `dist/`.
2. Hébergez `dist/` sur Netlify / Vercel / Cloudflare Pages (SPA : ajoutez une règle de rewrite
   `/* → /index.html`), ou sur votre propre serveur nginx/Apache.
3. Définissez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` comme variables d'environnement
   du service d'hébergement (et pas seulement dans `.env` local).
4. Dans Supabase → Auth → URL Configuration, ajoutez l'URL de production dans les allowed URLs.

---

## 10. Technologies

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · React Router 7 ·
Supabase (PostgreSQL + Auth + RLS) · lucide-react · react-hot-toast · zod · date-fns.
