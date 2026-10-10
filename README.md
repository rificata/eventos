# Agenda Grátis – Eventos Culturais

Site estático de agenda de eventos **gratuitos**, ordenada por data/hora crescente.  
Design sóbrio de agenda cultural, 100% responsivo (portrait + landscape), PWA-ready com notificações locais no Android.

## Como usar (rápido)

1. Faz fork / clona este repositório.
2. Ativa **GitHub Pages** (Settings → Pages → Source: main branch / root).
3. Abre o site. Os eventos de demonstração já estão lá.
4. Clica em **Adicionar** para meter novos eventos (ficam no teu browser via `localStorage`).
5. Se quiseres partilhar eventos com o mundo:
   - Adiciona os que quiseres
   - Clica em **Exportar JSON** (barra no fundo)
   - Substitui o conteúdo de `eventos.json` (ou cola no `DEFAULT_EVENTS` do `js/app.js`)
   - Faz commit + push

## Funcionalidades

- Ordenação automática por data + hora (mais próximo primeiro)
- Filtros: Todos / Hoje / Esta semana / Próximos 30 dias
- Pesquisa por título, local ou categoria
- Formulário completo (data, hora, local, Google Maps, categoria, preço, descrição, organizador)
- Edição e apagar eventos
- PWA: instalável no ecrã inicial, funciona offline
- Notificações locais no Android (1 hora antes de eventos nas próximas 24h)
- Design dark cultural com degradés e tipografia profissional
- Acessível (foco visível, semantic HTML, ARIA)

## Estrutura

```
agenda-eventos/
├── index.html
├── css/styles.css
├── js/app.js
├── sw.js
├── manifest.json
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-32.png
└── README.md
```

## Notas técnicas

- Vanilla JS (ES2022+), CSS moderno (custom properties, grid, flex, backdrop-filter)
- Sem dependências externas (só Google Fonts)
- Mobile-first, safe-area insets, prefers-reduced-motion
- Os eventos guardados localmente **não** são partilhados entre dispositivos. Para uma versão multi-utilizador real precisarias de backend (Supabase, Firebase, ou GitHub Actions + JSON).

Feito com café e desprezo por bilhetes caros.
