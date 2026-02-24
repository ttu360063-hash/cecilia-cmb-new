# Supabase Setup

## 1) Criar projeto no Supabase
- Acesse `https://supabase.com/dashboard`
- Crie um novo projeto

## 2) Criar/atualizar tabelas e seguranca
- Abra `SQL Editor`
- Execute o conteudo de `supabase/schema.sql`
- Este script cria as tabelas de `users` e `devices`, ativa RLS e bloqueia acesso direto por `anon`.

## 3) Configurar variaveis locais (`.env`)
Use o arquivo `.env.example` como base:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

## 4) Testar local
```bash
npm install
npm run dev
```

## 5) Configurar no Vercel
No projeto da Vercel, adicione as mesmas variaveis do `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

Depois faca novo deploy.

## 6) Primeiro acesso
Se nao existir usuario cadastrado, o sistema cria automaticamente:
- Nome: `Matheus`
- Usuario: `matheus`
- Senha: `areazinho`
- Perfil: `administrador`
