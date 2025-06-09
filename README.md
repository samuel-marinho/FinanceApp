# Sistema de Controle Financeiro

Este é um sistema simples de controle financeiro que permite registrar despesas, categorizá-las e visualizar resumos por período.

## Funcionalidades

- Registro de despesas com nome, categoria e valor
- Adição em lote de despesas
- Visualização de resumo por categoria
- Filtro por período
- Interface responsiva

## Requisitos

- Python 3.8+
- MongoDB
- Navegador web moderno

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
pip install -r requirements.txt
```
3. Configure as variáveis de ambiente no arquivo `.env`
4. Execute o servidor:
```bash
uvicorn app.main:app --reload
```

## Tecnologias Utilizadas

- Backend: FastAPI
- Banco de Dados: MongoDB
- Frontend: HTML, CSS, JavaScript 