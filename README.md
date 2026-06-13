# CM Framework

CM Framework est un nouveau socle de framework full stack inspire par la lisibilite et l'organisation de Laravel, mais bati avec notre propre direction technique autour de JavaScript, TypeScript, Python, HTML et CSS.

## Objectif

- utiliser l'extension `.cm` pour les pages, layouts et composants
- garder une architecture claire pour un projet full stack
- fournir une CLI `cm` simple pour creer, verifier, servir et construire un projet
- preparer une base evolutive pour notre propre moteur de rendu, notre propre CSS et nos propres icones

## Commandes

```bash
npm run doctor
npm run install:cm
npm run dev
npm run build
```

## Structure

```text
app/
  pages/
  layouts/
  components/
  controllers/
  models/
  services/
  middleware/
  events/
  listeners/
  jobs/
  api/
bootstrap/
config/
database/
public/
resources/
routes/
src/
storage/
vendor/
plugins/
logs/
tests/
```

## Creation d'un nouveau projet

```bash
node ./bin/cm.mjs new mon-projet
```
