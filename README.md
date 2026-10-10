# Agenda Grátis – Eventos Culturais

Site estático de agenda de eventos **gratuitos**, ordenada por data/hora crescente.  
Design sóbrio de agenda cultural, 100% responsivo (portrait + landscape), PWA-ready com notificações locais no Android.

## Como funciona a partilha de eventos

| O quê | Quem vê | Onde vive |
|-------|---------|-----------|
| **Lista oficial** | Toda a gente | Ficheiro `eventos.json` no repositório |
| **Pré-visualização local** | Só tu | `localStorage` do teu browser |

### Fluxo recomendado para adicionar eventos (partilhados)

1. Clica em **Adicionar** no site e preenche o formulário (fica só no teu browser).
2. Quando estiveres satisfeito, clica em **Exportar eventos.json** (barra no fundo).
3. Substitui o ficheiro `eventos.json` no repositório pelo que descarregaste.
4. Faz **commit + push**.
5. Em poucos segundos toda a gente vê os novos eventos.

Alternativa rápida: edita diretamente o `eventos.json` no GitHub (botão Edit) e faz commit.

## Como meter no ar

1. Cria um repositório no GitHub
2. Faz upload de toda a pasta
3. Settings → Pages → Source: branch `main` / root
4. Pronto

## Funcionalidades

- Fonte de verdade: `eventos.json` (partilhado)
- Ordenação automática por data + hora (mais próximo primeiro)
- Filtros: Todos / Hoje / Esta semana / Próximos 30 dias
- Pesquisa por título, local ou categoria
- Formulário completo + pré-visualização local
- PWA: instalável + offline
- Notificações locais no Android (1 h antes)
- Design dark cultural profissional

## Estrutura

```
agenda-eventos/
├── index.html
├── eventos.json          ← lista oficial (edita isto para partilhar)
├── css/styles.css
├── js/app.js
├── sw.js
├── manifest.json
├── icons/
└── README.md
```

## Notas técnicas

- Vanilla JS moderno, CSS com custom properties
- Sem dependências (só Google Fonts)
- Mobile-first + safe-area + prefers-reduced-motion
- Para uma solução 100% colaborativa em tempo real (qualquer pessoa adiciona e toda a gente vê imediatamente) precisarias de um backend grátis (Supabase, Firebase, etc.). Este setup é o compromisso mais limpo e profissional para GitHub Pages estático.

Feito com café e desprezo por bilhetes caros.
