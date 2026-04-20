const express = require("express");

const app = express();

app.use(express.json());

let produtos = [
  { id: 1, nome: "Notebook", preco: 2000, quantidade: 10 },
  { id: 2, nome: "Controle Xbox", preco: 350, quantidade: 15 },
];

app.get("/api/produtos", (req, res) => res.json(produtos));

app.get("/api/produtos/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const produto = produtos.find((p) => p.id === id);

  if (!produto) {
    return res.status(404).json({
      mensagem: "Produto não encontrado. Verifique o ID informado.",
    });
  }

  res.json(produto);
});

app.post("/api/produtos", (req, res) => {
  const { nome } = req.body;
  const { preco } = req.body;
  const { quantidade } = req.body;

  const novoProduto = {
    id: produtos[produtos.length - 1].id + 1,
    nome,
    preco,
    quantidade,
  };

  produtos.push(novoProduto);

  res.status(201).json(novoProduto);
});

app.put("/api/produtos/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const { nome } = req.body;
  const { preco } = req.body;
  const { quantidade } = req.body;

  const produto = produtos.find((p) => p.id === id);

  if (!produto) {
    return res.status(404).json({
      mensagem: "Produto não encontrado para edição.",
    });
  }

  produto.nome = nome;
  produto.preco = preco;
  produto.quantidade = quantidade;

  res.json(produto);
});
