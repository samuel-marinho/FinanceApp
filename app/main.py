from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional

load_dotenv()

app = FastAPI()

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo Pydantic para validação
class Transacao(BaseModel):
    nome: str
    categoria: str
    valor: float
    data: Optional[datetime] = Field(default_factory=datetime.now)

class Orcamento(BaseModel):
    categoria: str
    valor: float
    data: Optional[datetime] = Field(default_factory=datetime.now)

# Configuração do MongoDB
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.financas_db

# Configuração dos templates e arquivos estáticos
templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

CATEGORIAS_FIXAS = [
    {
        "nome": "Transporte",
        "descricao": "Gastos com ônibus, combustível, Uber, etc."
    },
    {
        "nome": "Mercado",
        "descricao": "Compras de supermercado e alimentos."
    },
    {
        "nome": "Saúde",
        "descricao": "Medicamentos, consultas, exames, plano de saúde."
    },
    {
        "nome": "Contas",
        "descricao": "Água, luz, internet, telefone, aluguel, etc."
    },
    {
        "nome": "Gastos Extras",
        "descricao": "Lanches, lazer, compras não recorrentes."
    }
]

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/resumo", response_class=HTMLResponse)
async def resumo(request: Request):
    return templates.TemplateResponse("resumo.html", {"request": request})

@app.post("/api/transacoes")
async def criar_transacoes(transacoes: List[Transacao]):
    for transacao in transacoes:
        transacao_dict = transacao.dict()
        transacao_dict["data"] = datetime.now()
        await db.transacoes.insert_one(transacao_dict)
    return {"message": "Transações registradas com sucesso"}

@app.get("/api/transacoes")
async def listar_transacoes(data_inicio: str = None, data_fim: str = None):
    filtro = {}
    if data_inicio and data_fim:
        filtro["data"] = {
            "$gte": datetime.fromisoformat(data_inicio),
            "$lte": datetime.fromisoformat(data_fim)
        }
    transacoes = await db.transacoes.find(filtro).sort("data", -1).to_list(length=None)
    # Converter ObjectId para string
    for transacao in transacoes:
        transacao["_id"] = str(transacao["_id"])
    return transacoes

@app.get("/api/resumo")
async def obter_resumo(data_inicio: str = None, data_fim: str = None):
    filtro = {}
    if data_inicio and data_fim:
        filtro["data"] = {
            "$gte": datetime.fromisoformat(data_inicio),
            "$lte": datetime.fromisoformat(data_fim)
        }
    
    pipeline = [
        {"$match": filtro},
        {"$group": {
            "_id": "$categoria",
            "total": {"$sum": "$valor"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    resumo = await db.transacoes.aggregate(pipeline).to_list(length=None)
    return resumo

@app.put("/api/transacoes/{id}")
async def editar_transacao(id: str, transacao: Transacao):
    result = await db.transacoes.update_one(
        {"_id": ObjectId(id)}, 
        {"$set": transacao.dict()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"message": "Transação atualizada com sucesso"}

@app.delete("/api/transacoes/{id}")
async def excluir_transacao(id: str):
    result = await db.transacoes.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"message": "Transação excluída com sucesso"}

@app.post("/api/orcamentos")
async def definir_orcamento(orcamento: Orcamento):
    # Atualiza ou insere orçamento para a categoria
    await db.orcamentos.update_one(
        {"categoria": orcamento.categoria},
        {"$set": {"valor": orcamento.valor}},
        upsert=True
    )
    return {"message": "Orçamento definido com sucesso"}

@app.get("/api/orcamentos")
async def listar_orcamentos():
    orcamentos = await db.orcamentos.find().to_list(length=None)
    # Converter ObjectId para string
    for orcamento in orcamentos:
        orcamento["_id"] = str(orcamento["_id"])
    return orcamentos

@app.delete("/api/orcamentos/{id}")
async def excluir_orcamento(id: str):
    result = await db.orcamentos.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return {"message": "Orçamento excluído com sucesso"}

@app.get("/api/orcamentos_com_gastos")
async def orcamentos_com_gastos():
    orcamentos = {o["categoria"]: o["valor"] for o in await db.orcamentos.find().to_list(length=None)}
    # Calcular gastos por categoria
    pipeline = [
        {"$group": {"_id": "$categoria", "total_gasto": {"$sum": "$valor"}}}
    ]
    gastos = {g["_id"]: g["total_gasto"] for g in await db.transacoes.aggregate(pipeline).to_list(length=None)}
    # Montar resposta
    resultado = []
    for cat in CATEGORIAS_FIXAS:
        nome = cat["nome"]
        descricao = cat["descricao"]
        orc = orcamentos.get(nome, 0)
        gasto = gastos.get(nome, 0)
        disponivel = orc - gasto
        resultado.append({
            "categoria": nome,
            "descricao": descricao,
            "orcamento": orc,
            "gasto": gasto,
            "disponivel": disponivel
        })
    return resultado 