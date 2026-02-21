# Supabase Setup

## 1) Criar projeto no Supabase
- Acesse `https://supabase.com/dashboard`
- Crie um novo projeto

## 2) Criar as tabelas
- Abra `SQL Editor`
- Execute o conteúdo de `supabase/schema.sql`

## 3) Configurar variáveis locais
- Copie `.env.example` para `.env`
- Preencha:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 4) Testar local
- Rode:
```bash
npm install
npm run dev
```

## 5) Configurar no Vercel
- No projeto da Vercel, adicione as mesmas variáveis:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Faça novo deploy
