const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Produtos",
      version: "1.0.0",
      description: "Documentação da API de Produtos com Express",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./index.js"], // caminho do seu arquivo
};

const swaggerSpec = swaggerJsdoc(options);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.json());

let produtos = [
  { id: 1, nome: "Notebook", preco: 2000, quantidade: 10 },
  { id: 2, nome: "Controle Xbox", preco: 350, quantidade: 15 },
];

/**
 * @swagger
 * /api/produtos:
 *   get:
 *     summary: Lista ou busca produtos
 *     description: Retorna todos os produtos ou filtra pelo nome informado na query string
 *     parameters:
 *       - in: query
 *         name: nome
 *         required: false
 *         description: Termo para busca no nome do produto (case insensitive)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de produtos (com ou sem filtro)
 */
app.get("/api/produtos", (req, res) => {
  const { nome } = req.query;

  if (!nome || nome.trim() === "") {
    return res.json(produtos);
  }

  const produto = produtos.filter((p) => {
    return p.nome.toLowerCase().includes(nome.toLowerCase());
  });

  res.json(produto);
});

/**
 * @swagger
 * /api/produtos/estoque:
 *   get:
 *     summary: Lista produtos em estoque
 *     description: Retorna apenas os produtos com quantidade maior que zero
 *     responses:
 *       200:
 *         description: Lista de produtos disponíveis em estoque
 */
app.get("/api/produtos/estoque", (req, res) => {
  const produtosComEstoque = produtos.filter((p) => p.quantidade > 0);
  res.json(produtosComEstoque);
});

/**
 * @swagger
 * /api/produtos/preco:
 *   get:
 *     summary: Lista produtos com preço acima de um valor
 *     description: Retorna produtos com preço maior que o valor informado na query string
 *     parameters:
 *       - in: query
 *         name: min
 *         required: true
 *         description: Valor mínimo do preço para filtrar os produtos
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Lista de produtos com preço acima do valor informado
 *       400:
 *         description: Parâmetro de preço inválido
 */
app.get("/api/produtos/preco", (req, res) => {
  const { min } = req.query;

  if (!min) {
    return res.status(400).json({
      mensagem: "Preço não pode ficar vazio.",
    });
  }
  const minNumero = Number(min);

  if (isNaN(minNumero)) {
    return res.status(400).json({
      mensagem: "O valor de preço deve ser um número válido.",
    });
  }

  const produtosComPrecoMaiorQueMin = produtos.filter(
    (p) => p.preco > minNumero,
  );

  res.json(produtosComPrecoMaiorQueMin);
});

/**
 * @swagger
 * /api/produtos/{id}:
 *   get:
 *     summary: Retorna um produto pelo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do produto
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produto encontrado
 *       404:
 *         description: Produto não encontrado
 */
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

/**
 * @swagger
 * /api/produtos:
 *   post:
 *     summary: Cria um novo produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               preco:
 *                 type: number
 *               quantidade:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Produto criado
 */
app.post("/api/produtos/", (req, res) => {
  const { nome } = req.body;
  const { preco } = req.body;
  const { quantidade } = req.body;

  if (!nome || nome.trim() === "")
    return res.status(400).json({
      mensagem: "O nome do produto não pode ser vazio!",
    });

  if (preco == null || preco <= 0)
    return res
      .status(400)
      .json({ mensagem: "O preço não pode ser menor ou igual a zero." });

  if (quantidade == null || quantidade < 0)
    return res
      .status(400)
      .json({ mensagem: "A quantidade não pode ser negativa." });

  const nomeExiste = produtos.some(
    (p) => p.nome.toLowerCase() === nome.toLowerCase(),
  );
  if (nomeExiste) {
    return res
      .status(400)
      .json({ mensagem: "Já existe produto com esse nome." });
  }

  const novoProduto = {
    id: produtos[produtos.length - 1].id + 1,
    nome,
    preco,
    quantidade,
  };

  produtos.push(novoProduto);

  res.status(201).json(novoProduto);
});

/**
 * @swagger
 * /api/produtos/{id}:
 *   put:
 *     summary: Atualiza um produto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               preco:
 *                 type: number
 *               quantidade:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Produto atualizado
 *       404:
 *         description: Produto não encontrado
 */
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

/**
 * @swagger
 * /api/produtos/{id}:
 *   delete:
 *     summary: Remove um produto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produto removido
 *       404:
 *         description: Produto não encontrado
 */
app.delete("/api/produtos/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const existe = produtos.some((p) => p.id === id);

  if (!existe) {
    return res.status(404).json({
      mensagem: "Produto não encontrado para exclusão.",
    });
  }

  const produtoInfo = produtos.find((p) => p.id === id);
  produtos = produtos.filter((p) => p.id !== id);
  res.json({
    mensagem: "Produto excluído com sucesso.",
    produto: produtoInfo.nome,
    preco: produtoInfo.preco,
    quantidade: produtoInfo.quantidade,
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
  console.log("Swagger rodando em http://localhost:3000/docs");
});
