const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function inicializarBanco() {
  await connection.query(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    quantidade INT DEFAULT 0,
    sku VARCHAR(50) NOT NULL UNIQUE
  );
`);

  await connection.query(`
    INSERT INTO produtos(nome, preco, quantidade, sku)
    VALUES ('Notebook', 2000.0, 10, 'NOTE-01'), ('Mouse', 150.0, 25, 'MOUSE-01')
    ON DUPLICATE KEY UPDATE
      preco = VALUES(preco),
      quantidade = VALUES(quantidade);
    `);
}

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
app.get("/api/produtos", async (req, res) => {
  try {
    const { nome } = req.query;

    if (!nome || nome == "") {
      const [rows] = await connection.query(
        "SELECT * FROM produtos ORDER BY id",
      );
      return res.json(rows);
    }

    const [rows] = await connection.query(
      "SELECT * FROM produtos WHERE nome like ?",
      [`%${nome}%`],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar produtos" });
  }
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
app.get("/api/produtos/estoque", async (req, res) => {
  const [rows] = await connection.query(
    "SELECT * FROM produtos WHERE quantidade > 0",
  );
  res.json(rows);
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
app.get("/api/produtos/preco", async (req, res) => {
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

  const [rows] = await connection.query(
    "SELECT * FROM produtos WHERE preco > ?",
    [min],
  );

  res.json(rows);
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
app.get("/api/produtos/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  if (!id) {
    return res.status(400).json({ message: "Id não pode ficar vazio." });
  }

  const idNumber = Number(id);

  if (isNaN(idNumber)) {
    return res.status(400).json({
      mensagem: "O valor do id deve ser um número válido.",
    });
  }

  const [rows] = await connection.query("SELECT * FROM produtos WHERE id = ?", [
    idNumber,
  ]);

  if (!rows[0]) {
    return res
      .status(404)
      .json({ mensagem: "Nenhum produto com o id informado foi encontrado." });
  }

  res.json(rows);
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
 *               sku:
 *                 type: string
 *     responses:
 *       201:
 *         description: Produto criado
 */
app.post("/api/produtos/", async (req, res) => {
  const { nome, preco, quantidade, sku } = req.body;

  if (!nome || nome.trim() === "")
    return res.status(400).json({
      mensagem: "O nome do produto não pode ser vazio!",
    });

  if (!sku || sku.trim() === "")
    return res.status(400).json({
      mensagem: "O sku do produto não pode ser vazio!",
    });

  if (preco == null || preco <= 0)
    return res
      .status(400)
      .json({ mensagem: "O preço não pode ser menor ou igual a zero." });

  if (quantidade == null || quantidade < 0)
    return res
      .status(400)
      .json({ mensagem: "A quantidade não pode ser negativa." });

  const [skuExiste] = await connection.query(
    "SELECT sku FROM produtos WHERE sku= ?",
    [sku],
  );

  if (skuExiste.length > 0) {
    return res.status(409).json({
      mensagem: "Já existe produto com esse sku.",
    });
  }

  const [result] = await connection.query(
    "INSERT INTO produtos(nome, preco, quantidade, sku) VALUES(?, ?, ?, ?)",
    [nome, preco, quantidade, sku],
  );

  const [rows] = await connection.query("SELECT * FROM produtos WHERE id = ?", [
    result.insertId,
  ]);

  res.status(201).json(rows[0]);
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

inicializarBanco()
  .then(() => {
    app.listen(3000, () => {
      console.log("Servidor rodando em http://localhost:3000");
      console.log("Swagger rodando em http://localhost:3000/docs");
      console.log("MySQL conectado na porta 3306");
    });
  })
  .catch((error) => {
    console.log("Erro ao inicializar o banco de dados: ", error.message);
  });
