package handler

import (
	"database/sql"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed templates/*
var t embed.FS

//go:embed db.sqlite
var dbFile embed.FS

type Data struct {
	Products  []*Product
	Timestamp string
	Count     uint16
	Index     uint16
}

type Product struct {
	ID        uint16
	Name      string
	Url       string
	ImgUrl    string
	Title     string
	Rating    float32
	Reviews   uint16
	Sales     uint16
	Price     float32
	UsedPrice float32
	Save      float32
	Region    string
	Timestamp string
}

type QueryParams struct {
	Queries    []string
	Offset     uint16
	OrderBy    string
	StartIndex uint16
}

func getCount(db *sql.DB) uint16 {
	var count uint16
	countQuery := "SELECT COUNT(*) FROM products"
	db.QueryRow(countQuery).Scan(&count)
	return count
}

func getLatestTimestamp(db *sql.DB) string {
	var timestamp string
	timestampQuery := "SELECT timestamp FROM products ORDER BY timestamp DESC LIMIT 1"
	db.QueryRow(timestampQuery).Scan(&timestamp)
	t, _ := time.Parse(time.RFC3339, timestamp)
	return t.Format("02/01/2006 15:04:05")
}

func buildQuery(params QueryParams) (string, []interface{}) {
	conditions := make([]string, 0, len(params.Queries)+1)
	queryParams := make([]interface{}, 0, len(params.Queries)+1)
	baseQuery := "SELECT * FROM products WHERE "

	for _, query := range params.Queries {
		conditions = append(conditions, "name LIKE ?")
		queryParams = append(queryParams, "%"+query+"%")
	}

	allowedColumns := map[string]bool{
		"rating desc":   true,
		"reviews desc":  true,
		"sales desc":    true,
		"price asc":     true,
		"usedPrice asc": true,
		"save desc":     true,
	}

	if !allowedColumns[params.OrderBy] {
		params.OrderBy = "id asc"
	}

	orderByClause := " ORDER BY " + params.OrderBy + " LIMIT 10 OFFSET ?"
	queryParams = append(queryParams, params.Offset)

	queryString := baseQuery + strings.Join(conditions, " AND ") + orderByClause
	return queryString, queryParams
}

func getData(params QueryParams) Data {
	db, _ := sql.Open("sqlite3", "db.sqlite")

	queryString, queryParams := buildQuery(params)

	stmt, _ := db.Prepare(queryString)
	rows, _ := stmt.Query(queryParams...)

	products := make([]*Product, 0, 10)
	index := params.StartIndex
	for rows.Next() {
		product := new(Product)
		rows.Scan(&product.ID, &product.Name, &product.Url, &product.ImgUrl, &product.Title, &product.Rating, &product.Reviews, &product.Sales, &product.Price, &product.UsedPrice, &product.Save, &product.Region, &product.Timestamp)
		product.ID = index + 1
		products = append(products, product)
		index++
	}

	count := getCount(db)
	timestamp := getLatestTimestamp(db)

	return Data{
		Products:  products,
		Timestamp: timestamp,
		Count:     count,
		Index:     uint16(index),
	}
}

func index(w http.ResponseWriter, r *http.Request) {
	tmpl, _ := template.ParseFS(t, "templates/*")

	templateName := r.URL.Query().Get("template")
	queries := strings.Split(r.URL.Query().Get("search"), " ")
	order := r.URL.Query().Get("order")
	offset64, _ := strconv.ParseUint(r.URL.Query().Get("offset"), 10, 16)

	if templateName == "" {
		templateName = "index"
	}

	offset := uint16(offset64)
	startIndex := offset

	data := getData(QueryParams{Queries: queries, Offset: offset, OrderBy: order, StartIndex: startIndex})

	w.Header().Set("Content-Type", "text/html")
	tmpl.ExecuteTemplate(w, templateName, Data{Products: data.Products, Count: data.Count, Timestamp: data.Timestamp})
}

// vercel serverless
// func main() {
// 	http.Handle("/public/", http.StripPrefix("/public/", http.FileServer(http.Dir("./public"))))
// 	http.HandleFunc("/", index)
// 	log.Fatal(http.ListenAndServe("localhost:5000", nil))
// }
