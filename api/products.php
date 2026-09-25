<?php
/**
 * Surest Plug - Products API (PHP + MySQL Backend)
 * Handles full Ready-Made Website CRUD operations with complete persistence,
 * database transaction safety, and broadcast notification on product creation.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetProducts($pdo);
        break;
    case 'POST':
        handleCreateProduct($pdo);
        break;
    case 'PUT':
        handleUpdateProduct($pdo);
        break;
    case 'DELETE':
        handleDeleteProduct($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}

/**
 * Fetch all ready-made website products from MySQL database
 */
function handleGetProducts($pdo) {
    try {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        $category = isset($_GET['category']) ? cleanInput($_GET['category']) : '';

        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT * FROM `products` WHERE `id` = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();

            if (!$product) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Product not found']);
                return;
            }

            if (!empty($product['features']) && is_string($product['features'])) {
                $decoded = json_decode($product['features'], true);
                $product['features'] = $decoded !== null ? $decoded : explode("\n", $product['features']);
            } else {
                $product['features'] = [];
            }
            $product['price'] = (float)$product['price'];
            $product['featured'] = (bool)$product['featured'];

            echo json_encode(['success' => true, 'product' => $product]);
            return;
        }

        $query = "SELECT * FROM `products`";
        $params = [];

        if (!empty($category)) {
            $query .= " WHERE `category` = ?";
            $params[] = $category;
        }
        $query .= " ORDER BY `featured` DESC, `id` DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        foreach ($products as &$p) {
            if (!empty($p['features']) && is_string($p['features'])) {
                $decoded = json_decode($p['features'], true);
                $p['features'] = $decoded !== null ? $decoded : explode("\n", $p['features']);
            } else {
                $p['features'] = [];
            }
            $p['price'] = (float)$p['price'];
            $p['featured'] = (bool)$p['featured'];
        }

        echo json_encode(['success' => true, 'products' => $products]);
    } catch (Exception $e) {
        error_log("Products GET Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to load products from database']);
    }
}

/**
 * Add a new ready-made website product to MySQL database with broadcast notification
 */
function handleCreateProduct($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $name = isset($input['name']) ? trim($input['name']) : '';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $price = isset($input['price']) ? (float)$input['price'] : 0.0;
        $category = isset($input['category']) ? cleanInput($input['category']) : 'ready_made_website';
        $image = isset($input['image']) ? $input['image'] : (isset($input['preview_image_path']) ? $input['preview_image_path'] : '');
        $previewImagePath = isset($input['preview_image_path']) ? $input['preview_image_path'] : $image;
        $demoUrl = isset($input['demo_url']) ? trim($input['demo_url']) : null;
        $adminEmail = isset($input['admin_email']) ? trim($input['admin_email']) : null;
        $adminPassword = isset($input['admin_password']) ? $input['admin_password'] : null;
        $websiteZipPath = isset($input['website_zip_path']) ? $input['website_zip_path'] : null;
        $websiteZipName = isset($input['website_zip_name']) ? $input['website_zip_name'] : null;
        $websiteZipSize = isset($input['website_zip_size']) ? intval($input['website_zip_size']) : 0;
        $websiteZipData = isset($input['website_zip_data']) ? $input['website_zip_data'] : null;
        $features = isset($input['features']) ? $input['features'] : [];
        $availability = isset($input['availability']) ? $input['availability'] : 'available';
        $featured = !empty($input['featured']) ? 1 : 0;
        $deliveryTime = isset($input['delivery_time']) ? $input['delivery_time'] : 'Instant ZIP Delivery';

        // Validation
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Website name is required']);
            return;
        }
        if (empty($description)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Website description is required']);
            return;
        }
        if ($price <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'A valid price greater than 0 is required']);
            return;
        }
        if (empty($image) && empty($previewImagePath)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Preview image is required']);
            return;
        }

        $featuresJson = is_array($features) ? json_encode(array_values($features)) : json_encode([]);

        $pdo->beginTransaction();

        $sql = "INSERT INTO `products` (
            `name`, `category`, `description`, `price`, `image`, `preview_image_path`,
            `demo_url`, `admin_email`, `admin_password`, `website_zip_path`,
            `website_zip_name`, `website_zip_size`, `website_zip_data`,
            `features`, `availability`, `featured`, `delivery_time`, `created_at`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $name, $category, $description, $price, $image, $previewImagePath,
            $demoUrl, $adminEmail, $adminPassword, $websiteZipPath,
            $websiteZipName, $websiteZipSize, $websiteZipData,
            $featuresJson, $availability, $featured, $deliveryTime
        ]);

        $newProductId = $pdo->lastInsertId();

        // Broadcast notification to all non-admin users
        $notifStmt = $pdo->prepare("
            INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `reference_id`, `link_route`, `read_status`, `created_at`)
            SELECT `id`, 'New Product Available', CONCAT('A new ready-made website \"', ?, '\" has been added to Surest Plug. Tap to view.'), 'product', ?, 'marketplace', 0, NOW()
            FROM `users` WHERE `role` != 'admin'
        ");
        $notifStmt->execute([$name, $newProductId]);

        $pdo->commit();

        $stmtFetch = $pdo->prepare("SELECT * FROM `products` WHERE `id` = ?");
        $stmtFetch->execute([$newProductId]);
        $createdProduct = $stmtFetch->fetch();
        $createdProduct['features'] = is_array($features) ? $features : [];
        $createdProduct['price'] = (float)$createdProduct['price'];
        $createdProduct['featured'] = (bool)$createdProduct['featured'];

        echo json_encode([
            'success' => true,
            'message' => 'Product published successfully',
            'product' => $createdProduct
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Product Create Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Unable to save the product. Please try again.']);
    }
}

/**
 * Update an existing product in MySQL database
 */
function handleUpdateProduct($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
            return;
        }

        $id = isset($input['id']) ? intval($input['id']) : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Product ID is required']);
            return;
        }

        $stmt = $pdo->prepare("SELECT * FROM `products` WHERE `id` = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Product not found']);
            return;
        }

        $name = isset($input['name']) ? trim($input['name']) : $existing['name'];
        $description = isset($input['description']) ? trim($input['description']) : $existing['description'];
        $price = isset($input['price']) ? (float)$input['price'] : (float)$existing['price'];
        $image = isset($input['image']) && !empty($input['image']) ? $input['image'] : $existing['image'];
        $previewImagePath = isset($input['preview_image_path']) && !empty($input['preview_image_path']) ? $input['preview_image_path'] : $existing['preview_image_path'];
        $demoUrl = isset($input['demo_url']) ? trim($input['demo_url']) : $existing['demo_url'];
        $adminEmail = isset($input['admin_email']) ? trim($input['admin_email']) : $existing['admin_email'];
        $adminPassword = isset($input['admin_password']) ? $input['admin_password'] : $existing['admin_password'];
        $websiteZipPath = isset($input['website_zip_path']) && !empty($input['website_zip_path']) ? $input['website_zip_path'] : $existing['website_zip_path'];
        $websiteZipName = isset($input['website_zip_name']) && !empty($input['website_zip_name']) ? $input['website_zip_name'] : $existing['website_zip_name'];
        $websiteZipSize = isset($input['website_zip_size']) && intval($input['website_zip_size']) > 0 ? intval($input['website_zip_size']) : intval($existing['website_zip_size']);
        $websiteZipData = isset($input['website_zip_data']) && !empty($input['website_zip_data']) ? $input['website_zip_data'] : $existing['website_zip_data'];
        $features = isset($input['features']) ? $input['features'] : (json_decode($existing['features'], true) ?: []);
        $availability = isset($input['availability']) ? $input['availability'] : $existing['availability'];
        $featured = isset($input['featured']) ? (!empty($input['featured']) ? 1 : 0) : $existing['featured'];

        $featuresJson = is_array($features) ? json_encode(array_values($features)) : $existing['features'];

        $sql = "UPDATE `products` SET
            `name` = ?, `description` = ?, `price` = ?, `image` = ?,
            `preview_image_path` = ?, `demo_url` = ?, `admin_email` = ?,
            `admin_password` = ?, `website_zip_path` = ?, `website_zip_name` = ?,
            `website_zip_size` = ?, `website_zip_data` = ?, `features` = ?,
            `availability` = ?, `featured` = ?, `updated_at` = NOW()
            WHERE `id` = ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $name, $description, $price, $image,
            $previewImagePath, $demoUrl, $adminEmail,
            $adminPassword, $websiteZipPath, $websiteZipName,
            $websiteZipSize, $websiteZipData, $featuresJson,
            $availability, $featured, $id
        ]);

        $stmtFetch = $pdo->prepare("SELECT * FROM `products` WHERE `id` = ?");
        $stmtFetch->execute([$id]);
        $updatedProduct = $stmtFetch->fetch();
        $updatedProduct['features'] = is_array($features) ? $features : [];
        $updatedProduct['price'] = (float)$updatedProduct['price'];
        $updatedProduct['featured'] = (bool)$updatedProduct['featured'];

        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully',
            'product' => $updatedProduct
        ]);
    } catch (Exception $e) {
        error_log("Product Update Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update product in database']);
    }
}

/**
 * Delete a product permanently from MySQL database
 */
function handleDeleteProduct($pdo) {
    try {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            $input = json_decode(file_get_contents('php://input'), true);
            $id = isset($input['id']) ? intval($input['id']) : 0;
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Product ID is required']);
            return;
        }

        $stmt = $pdo->prepare("DELETE FROM `products` WHERE `id` = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
    } catch (Exception $e) {
        error_log("Product Delete Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete product from database']);
    }
}
