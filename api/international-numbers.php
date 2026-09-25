<?php
/**
 * Surest Plug - International Numbers API
 * Server-authoritative InstantNums integration for InfinityFree/PHP.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app_config.php';
require_once __DIR__ . '/../includes/security.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../config/instantnums.php';

header('Content-Type: application/json; charset=utf-8');

function intl_json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function intl_method() {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function intl_input() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function intl_user() {
    $user = getCurrentUser();
    if (!$user) intl_json(['success' => false, 'error' => 'Authentication required.'], 401);
    return $user;
}

function intl_canonical_country($value) {
    $raw = trim((string)$value);
    if ($raw === '') return '1';
    if (preg_match('/^\d+$/', $raw)) return $raw;

    $str = strtolower(trim(preg_replace('/\s+/', ' ', preg_replace('/\(.*?\)/', '', $raw))));
    $map = [
        'usa'=>'1','us'=>'1','united states'=>'1','united states of america'=>'1','america'=>'1',
        'uk'=>'2','gb'=>'2','united kingdom'=>'2','great britain'=>'2','england'=>'2',
        'netherlands'=>'3','holland'=>'3','nl'=>'3',
        'latvia'=>'5','lv'=>'5','sweden'=>'6','se'=>'6',
        'russia'=>'7','ru'=>'7','kazakhstan'=>'7','kz'=>'7',
        'portugal'=>'8','pt'=>'8','indonesia'=>'9','id'=>'9',
        'estonia'=>'10','ee'=>'10','vietnam'=>'11','vn'=>'11',
        'philippines'=>'12','ph'=>'12','romania'=>'13','ro'=>'13',
        'nigeria'=>'14','ng'=>'14','india'=>'15','in'=>'15',
        'kenya'=>'16','ke'=>'16','denmark'=>'19','dk'=>'19',
        'malaysia'=>'20','my'=>'20','poland'=>'21','pl'=>'21',
        'france'=>'23','fr'=>'23','germany'=>'24','de'=>'24',
        'ukraine'=>'25','ua'=>'25','egypt'=>'31','eg'=>'31',
        'ireland'=>'32','ie'=>'32','canada'=>'36','ca'=>'36',
        'ghana'=>'42','gh'=>'42','argentina'=>'43','ar'=>'43',
        'cameroon'=>'45','cm'=>'45','mexico'=>'53','mx'=>'53',
        'spain'=>'55','es'=>'55','turkey'=>'60','tr'=>'60',
        'brazil'=>'68','br'=>'68','italy'=>'79','it'=>'79',
        'south africa'=>'153','za'=>'153','australia'=>'159','au'=>'159'
    ];
    return $map[$str] ?? $raw;
}

function intl_services() {
    return [
        ['id'=>'924','name'=>'TikTok / Douyin'],
        ['id'=>'900','name'=>'WhatsApp'],
        ['id'=>'901','name'=>'Telegram'],
        ['id'=>'902','name'=>'Google / Gmail / YouTube'],
        ['id'=>'903','name'=>'Instagram'],
        ['id'=>'904','name'=>'Facebook'],
        ['id'=>'905','name'=>'X / Twitter'],
        ['id'=>'906','name'=>'OpenAI / ChatGPT'],
        ['id'=>'907','name'=>'Netflix'],
        ['id'=>'908','name'=>'Discord'],
        ['id'=>'909','name'=>'PayPal'],
        ['id'=>'910','name'=>'Snapchat'],
        ['id'=>'911','name'=>'Amazon'],
        ['id'=>'912','name'=>'Apple'],
        ['id'=>'913','name'=>'LinkedIn'],
        ['id'=>'914','name'=>'Tinder'],
        ['id'=>'915','name'=>'Steam'],
        ['id'=>'916','name'=>'Uber / UberEats'],
        ['id'=>'917','name'=>'Coinbase'],
        ['id'=>'918','name'=>'Binance'],
        ['id'=>'919','name'=>'WeChat'],
        ['id'=>'920','name'=>'Viber'],
        ['id'=>'921','name'=>'LINE'],
        ['id'=>'922','name'=>'Claude / Anthropic'],
        ['id'=>'923','name'=>'Claude AI'],
        ['id'=>'925','name'=>'Spotify']
    ];
}

function intl_default_countries() {
    return [
        ['id'=>'1','name'=>'USA'],
        ['id'=>'2','name'=>'United Kingdom (UK)'],
        ['id'=>'3','name'=>'Netherlands'],
        ['id'=>'23','name'=>'France'],
        ['id'=>'24','name'=>'Germany'],
        ['id'=>'68','name'=>'Brazil'],
        ['id'=>'15','name'=>'India'],
        ['id'=>'14','name'=>'Nigeria'],
        ['id'=>'42','name'=>'Ghana'],
        ['id'=>'16','name'=>'Kenya'],
        ['id'=>'36','name'=>'Canada'],
        ['id'=>'159','name'=>'Australia'],
        ['id'=>'55','name'=>'Spain'],
        ['id'=>'79','name'=>'Italy'],
        ['id'=>'53','name'=>'Mexico']
    ];
}

function classifyProviderError($error): string
{
    $message = strtolower(trim((string) $error));

    if ($message === '') {
        return 'PROVIDER_UNAVAILABLE';
    }

    if (
        strpos($message, 'timeout') !== false ||
        strpos($message, 'timed out') !== false ||
        strpos($message, 'connection') !== false ||
        strpos($message, 'curl') !== false
    ) {
        return 'TIMEOUT';
    }

    if (
        strpos($message, 'insufficient') !== false ||
        strpos($message, 'balance') !== false ||
        strpos($message, 'credit') !== false
    ) {
        return 'PROVIDER_INSUFFICIENT_BALANCE';
    }

    if (
        strpos($message, 'invalid') !== false ||
        strpos($message, 'malformed') !== false ||
        strpos($message, 'json') !== false
    ) {
        return 'INVALID_RESPONSE';
    }

    return 'PROVIDER_UNAVAILABLE';
}

function sanitizeProviderError($error): string
{
    $message = trim((string) $error);
    if ($message === '') {
        return 'International number service is temporarily unavailable.';
    }

    $lower = strtolower($message);

    if (
        strpos($lower, 'insufficient') !== false ||
        strpos($lower, 'balance') !== false ||
        strpos($lower, 'credit') !== false
    ) {
        return 'International number service is temporarily unavailable.';
    }

    if (
        strpos($lower, 'timeout') !== false ||
        strpos($lower, 'timed out') !== false ||
        strpos($lower, 'connection') !== false ||
        strpos($lower, 'curl') !== false
    ) {
        return 'Unable to reach international number service.';
    }

    if (
        strpos($lower, 'out of stock') !== false ||
        strpos($lower, 'not available') !== false ||
        strpos($lower, 'unavailable') !== false
    ) {
        return 'The requested number is currently unavailable.';
    }

    return 'International number service is temporarily unavailable.';
}

function intl_provider($endpoint, $method='GET', $payload=[]) {
    return instantnums_request($endpoint, $method, $payload);
}

function intl_error_response($result) {
    $code = (int)($result['_http_code'] ?? 0);
    $raw = $result['error'] ?? '';
    $classified = classifyProviderError((string)$raw);

    return [
        'success' => false,
        'error' => $classified['customerMessage'],
        'errorCode' => $classified['code'],
        'status' => $classified['code'],
        '_http_code' => $code
    ];
}

function intl_extract_data($result) {
    if (isset($result['data']) && is_array($result['data'])) return $result['data'];
    return is_array($result) ? $result : [];
}

function intl_extract_cost($result) {
    $d = intl_extract_data($result);
    foreach (['price_usd','cost_usd','price','cost'] as $key) {
        if (isset($d[$key]) && is_numeric($d[$key])) return (float)$d[$key];
    }
    foreach (['price_usd','cost_usd','price','cost'] as $key) {
        if (isset($result[$key]) && is_numeric($result[$key])) return (float)$result[$key];
    }
    return 0.22;
}

function intl_extract_stock($result) {
    $d = intl_extract_data($result);
    foreach (['available','stock','count','quantity'] as $key) {
        if (isset($d[$key]) && is_numeric($d[$key])) return max(0, (int)$d[$key]);
    }
    foreach (['available','stock','count','quantity'] as $key) {
        if (isset($result[$key]) && is_numeric($result[$key])) return max(0, (int)$result[$key]);
    }
    return null;
}

function intl_order_row($row) {
    return [
        'id' => (int)$row['id'],
        'orderId' => $row['provider_order_id'],
        'userId' => (int)$row['user_id'],
        'orderReference' => $row['order_reference'],
        'countryId' => $row['country_id'],
        'countryName' => $row['country_name'],
        'serviceId' => $row['service_id'],
        'serviceName' => $row['service_name'],
        'phoneNumber' => $row['phone_number'],
        'customerPrice' => (float)$row['customer_price'],
        'costUsd' => (float)$row['cost_usd'],
        'supplierCostNgn' => (float)$row['supplier_cost_ngn'],
        'profitNgn' => (float)$row['profit_ngn'],
        'providerStatus' => $row['provider_status'],
        'normalizedStatus' => $row['normalized_status'],
        'statusLabel' => $row['status_label'],
        'sms' => $row['sms'],
        'fullSms' => $row['full_sms'],
        'purchasedAt' => $row['purchased_at'],
        'expiresAt' => $row['expires_at'],
        'receivedAt' => $row['received_at'],
        'cancelledAt' => $row['cancelled_at'],
        'providerCancelled' => (bool)$row['provider_cancelled'],
        'cancellationPending' => (bool)$row['cancellation_pending'],
        'refunded' => (bool)$row['refunded'],
        'refundTransactionReference' => $row['refund_transaction_reference'],
        'lastSync' => $row['last_sync'],
        'lastChecked' => $row['last_checked'],
        'createdAt' => $row['created_at']
    ];
}

function intl_normalize_status($providerStatus, $sms) {
    $s = strtolower(trim((string)$providerStatus));
    if (in_array($s, ['cancelled','canceled'], true)) return ['cancelled','Cancelled'];
    if ($s === 'refunded') return ['refunded','Cancelled (Refunded)'];
    if (in_array($s, ['expired','timeout','timed_out'], true)) return ['expired','Expired'];
    if ($sms !== null && trim((string)$sms) !== '') return ['received','Verification code received'];
    if (in_array($s, ['received','code_received','sms_received'], true)) return ['received','Verification code received'];
    if (in_array($s, ['completed','finished'], true)) return ['expired','Expired without verification code'];
    return ['waiting','Waiting for verification code...'];
}

function intl_sanitize_sms($value) {
    if ($value === null) return [null, null];
    $full = trim((string)$value);
    if ($full === '') return [null, null];
    $lower = strtolower($full);
    if (in_array($lower, ['none','null','undefined','false','n/a','na'], true)) return [null,null];

    $code = null;
    if (preg_match('/\b\d{4,8}\b/', $full, $m)) $code = $m[0];
    return [$code, $full];
}

function intl_refund_locked($pdo, $row, $reason='International number cancelled') {
    if ((int)$row['refunded'] === 1) {
        return $row['refund_transaction_reference'];
    }

    $userStmt = $pdo->prepare("SELECT id,balance FROM users WHERE id=? FOR UPDATE");
    $userStmt->execute([(int)$row['user_id']]);
    $user = $userStmt->fetch();
    if (!$user) throw new Exception('User account not found.');

    $before = (float)$user['balance'];
    $amount = (float)$row['customer_price'];
    $after = round($before + $amount, 2);
    $ref = generateReference('TX-REF');

    $pdo->prepare("UPDATE users SET balance=?, updated_at=NOW() WHERE id=?")
        ->execute([$after, (int)$row['user_id']]);

    $pdo->prepare("
        INSERT INTO transactions
        (user_id,type,amount,balance_before,balance_after,reference,description,created_at)
        VALUES (?, 'refund', ?, ?, ?, ?, ?, NOW())
    ")->execute([
        (int)$row['user_id'], $amount, $before, $after, $ref,
        $reason . ' - ' . $row['order_reference']
    ]);

    $pdo->prepare("
        INSERT INTO notifications
        (user_id,title,message,type,reference_id,link_route,read_status,created_at)
        VALUES (?, 'International Number Refunded', ?, 'wallet', ?, 'transactions', 0, NOW())
    ")->execute([
        (int)$row['user_id'],
        '₦' . number_format($amount,2) . ' has been refunded to your wallet.',
        $row['order_reference']
    ]);

    return $ref;
}

function intl_sync_status($pdo, $row, $provider) {
    $data = intl_extract_data($provider);
    $providerStatus = $data['status'] ?? $provider['status'] ?? 'waiting';
    $smsRaw = $data['full_sms'] ?? $data['sms'] ?? $provider['full_sms'] ?? $provider['sms'] ?? null;
    [$code,$fullSms] = intl_sanitize_sms($smsRaw);
    [$normalized,$label] = intl_normalize_status($providerStatus, $fullSms);

    $receivedAt = $code ? ($row['received_at'] ?: date('Y-m-d H:i:s')) : $row['received_at'];

    $stmt = $pdo->prepare("
        UPDATE international_number_orders
        SET provider_status=?, normalized_status=?, status_label=?, sms=?, full_sms=?,
            received_at=?, last_sync=NOW(), last_checked=NOW(), updated_at=NOW()
        WHERE id=?
    ");
    $stmt->execute([
        (string)$providerStatus, $normalized, $label, $code, $fullSms,
        $receivedAt, (int)$row['id']
    ]);

    return [$normalized,$label,$code,$fullSms];
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$route = trim(preg_replace('#^/api/international-numbers/?#i', '', $path), '/');
$method = intl_method();

if ($route === 'countries') {
    $r = intl_provider('countries');
    if (!empty($r['success'])) {
        $d = intl_extract_data($r);
        if (isset($d['countries']) && is_array($d['countries'])) $d = $d['countries'];
        if (is_array($d) && array_is_list($d)) {
            $out=[];
            foreach ($d as $c) {
                if (!is_array($c)) continue;
                $id = $c['id'] ?? $c['country_id'] ?? $c['code'] ?? null;
                $name = $c['name'] ?? $c['country_name'] ?? null;
                if ($id !== null && $name) $out[]=['id'=>(string)$id,'name'=>(string)$name];
            }
            if ($out) intl_json(['success'=>true,'data'=>$out]);
        }
    }
    intl_json(['success'=>true,'data'=>intl_default_countries()]);
}

if ($route === 'services') {
    $country = intl_canonical_country($_GET['country'] ?? '');
    $r = intl_provider('services','GET',['country'=>$country]);
    if (!empty($r['success'])) {
        $d = intl_extract_data($r);
        if (isset($d['services']) && is_array($d['services'])) $d=$d['services'];
        if (is_array($d) && array_is_list($d) && count($d)) intl_json(['success'=>true,'data'=>$d]);
    }
    intl_json(['success'=>true,'data'=>intl_services()]);
}

if ($route === 'stock') {
    $service=(string)($_GET['service'] ?? '');
    $country=intl_canonical_country($_GET['country'] ?? '');
    $r=intl_provider('stock','GET',['service'=>$service,'country'=>$country]);
    if (empty($r['success'])) intl_json(intl_error_response($r));
    $stock=intl_extract_stock($r);
    if ($stock === null) intl_json(['success'=>false,'error'=>'Provider did not return a valid numeric stock count.'],502);
    intl_json(['success'=>true,'data'=>[
        'service'=>$service,'country'=>$country,'available'=>$stock,'is_in_stock'=>$stock>0
    ]]);
}

if ($route === 'price') {
    $service=(string)($_GET['service'] ?? '');
    $country=intl_canonical_country($_GET['country'] ?? '');
    $r=intl_provider('price','GET',['service'=>$service,'country'=>$country]);
    if (empty($r['success'])) {
        $price=instantnums_calculate_retail_price(0.22);
        intl_json(['success'=>false,'error'=>sanitizeProviderError($r['error'] ?? ''),'data'=>[
            'cost_usd'=>0.22,'customer_price'=>$price,'supplier_cost_ngn'=>0.22*INSTANTNUMS_USD_TO_NGN_RATE
        ]]);
    }
    $cost=intl_extract_cost($r);
    $price=instantnums_calculate_retail_price($cost);
    intl_json(['success'=>true,'data'=>[
        'cost_usd'=>$cost,
        'supplier_cost_ngn'=>round($cost*INSTANTNUMS_USD_TO_NGN_RATE,2),
        'customer_price'=>$price
    ]]);
}

if ($route === 'availability') {
    $service=(string)($_GET['service'] ?? '');
    $country=intl_canonical_country($_GET['country'] ?? '');
    $stockR=intl_provider('stock','GET',['service'=>$service,'country'=>$country]);
    if (empty($stockR['success'])) intl_json([
        'success'=>false,'available'=>false,'stock'=>null,
        'error'=>sanitizeProviderError($stockR['error'] ?? ''),
        'errorCode'=>classifyProviderError($stockR['error'] ?? '')['code']
    ]);
    $stock=intl_extract_stock($stockR);
    if ($stock === null) intl_json(['success'=>false,'available'=>false,'stock'=>null,'error'=>'Invalid provider response.'],502);
    $priceR=intl_provider('price','GET',['service'=>$service,'country'=>$country]);
    $cost=(!empty($priceR['success'])) ? intl_extract_cost($priceR) : 0.22;
    $price=instantnums_calculate_retail_price($cost);
    intl_json(['success'=>true,'available'=>$stock>0,'stock'=>$stock,'data'=>[
        'cost_usd'=>$cost,'supplier_cost_ngn'=>round($cost*INSTANTNUMS_USD_TO_NGN_RATE,2),'customer_price'=>$price
    ]]);
}

if ($route === 'balance') {
    $user=intl_user();
    if (($user['role'] ?? '') !== 'admin') intl_json(['success'=>false,'error'=>'Admin access required.'],403);
    $r=intl_provider('balance');
    if (empty($r['success'])) intl_json(intl_error_response($r));
    intl_json(['success'=>true,'data'=>intl_extract_data($r)]);
}

if ($route === 'purchase' && $method === 'POST') {
    $user=intl_user();
    $input=intl_input();
    $service=trim((string)($input['service'] ?? ''));
    $country=intl_canonical_country($input['country'] ?? '');

    if ($service === '') intl_json(['success'=>false,'error'=>'Service is required.'],400);

    $pdo=getDBConnection();

    // Prevent the same active provider order from being recorded twice.
    $provider=intl_provider('sms/purchase','POST',['service'=>$service,'country'=>$country]);
    if (empty($provider['success'])) intl_json(intl_error_response($provider));

    $d=intl_extract_data($provider);
    $providerOrderId=(string)($d['order_id'] ?? $d['orderId'] ?? $provider['order_id'] ?? '');
    $phone=(string)($d['phone_number'] ?? $d['phoneNumber'] ?? $provider['phone_number'] ?? '');
    $cost=(float)($d['cost_usd'] ?? $d['costUsd'] ?? $d['price_usd'] ?? $d['price'] ?? 0);

    if ($providerOrderId === '' || $phone === '') {
        intl_json(['success'=>false,'error'=>'Provider returned an incomplete number reservation.'],502);
    }

    if ($cost <= 0) $cost=0.22;
    $pricing=instantnums_calculate_retail_price($cost);
    $customerPrice=(float)$pricing['customerPrice'];
    $supplierNgn=(float)$pricing['supplierCostNgn'];
    $profit=(float)($customerPrice-$supplierNgn);

    try {
        $pdo->beginTransaction();

        $check=$pdo->prepare("SELECT * FROM international_number_orders WHERE provider_order_id=? LIMIT 1");
        $check->execute([$providerOrderId]);
        $existing=$check->fetch();
        if ($existing) {
            $pdo->commit();
            intl_json(['success'=>true,'data'=>[
                'order_id'=>$existing['provider_order_id'],
                'phone_number'=>$existing['phone_number'],
                'customer_price'=>(float)$existing['customer_price'],
                'cost_usd'=>(float)$existing['cost_usd'],
                'supplier_cost_ngn'=>(float)$existing['supplier_cost_ngn'],
                'profit_ngn'=>(float)$existing['profit_ngn'],
                'purchased_at'=>$existing['purchased_at'],
                'expires_at'=>$existing['expires_at']
            ]]);
        }

        $u=$pdo->prepare("SELECT * FROM users WHERE id=? FOR UPDATE");
        $u->execute([(int)$user['id']]);
        $locked=$u->fetch();
        if (!$locked || $locked['account_status']==='suspended') throw new Exception('Account is unavailable.');
        if ((float)$locked['balance'] < $customerPrice) {
            $pdo->rollBack();
            intl_provider('sms/' . rawurlencode($providerOrderId) . '/cancel','POST',[]);
            intl_json(['success'=>false,'error'=>'Insufficient wallet balance. Please fund your wallet to continue.'],400);
        }

        $before=(float)$locked['balance'];
        $after=round($before-$customerPrice,2);
        $orderRef=generateReference('SP-NUM-IN');
        $purchasedAt=date('Y-m-d H:i:s');
        $expiresAt=date('Y-m-d H:i:s',time()+1200);

        $pdo->prepare("
            UPDATE users SET balance=?, updated_at=NOW() WHERE id=?
        ")->execute([$after,(int)$user['id']]);

        $pdo->prepare("
            INSERT INTO international_number_orders
            (provider_order_id,user_id,order_reference,country_id,country_name,service_id,service_name,
             phone_number,cost_usd,supplier_cost_ngn,customer_price,profit_ngn,provider_status,
             normalized_status,status_label,purchased_at,expires_at,last_sync,last_checked)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
        ")->execute([
            $providerOrderId,(int)$user['id'],$orderRef,$country,null,$service,null,
            $phone,$cost,$supplierNgn,$customerPrice,$profit,'waiting',
            'waiting','Waiting for verification code...',$purchasedAt,$expiresAt
        ]);

        $txRef=generateReference('TX-PUR');
        $pdo->prepare("
            INSERT INTO transactions
            (user_id,type,amount,balance_before,balance_after,reference,description,created_at)
            VALUES (?, 'purchase', ?, ?, ?, ?, ?, NOW())
        ")->execute([
            (int)$user['id'],$customerPrice,$before,$after,$txRef,
            'International Number - ' . $phone
        ]);

        $pdo->prepare("
            INSERT INTO notifications
            (user_id,title,message,type,reference_id,link_route,read_status,created_at)
            VALUES (?,?,?,?,?,'numbers',0,NOW())
        ")->execute([
            (int)$user['id'],'International Number Activated! 📱',
            'Your virtual number ' . $phone . ' is ready.',
            'order',$orderRef
        ]);

        $pdo->commit();

        intl_json(['success'=>true,'data'=>[
            'order_id'=>$providerOrderId,
            'phone_number'=>$phone,
            'customer_price'=>$customerPrice,
            'cost_usd'=>$cost,
            'supplier_cost_ngn'=>$supplierNgn,
            'profit_ngn'=>$profit,
            'purchased_at'=>$purchasedAt,
            'expires_at'=>$expiresAt,
            'order_reference'=>$orderRef,
            'new_balance'=>$after
        ]]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        intl_provider('sms/' . rawurlencode($providerOrderId) . '/cancel','POST',[]);
        intl_json(['success'=>false,'error'=>'Unable to complete the number purchase. Please try again.'],500);
    }
}

if ($route === 'record-order' && $method === 'POST') {
    // Purchases are now recorded atomically by /purchase.
    intl_user();
    intl_json(['success'=>true,'message'=>'Order is already recorded by the server.']);
}

if ($route === 'status') {
    $user=intl_user();
    $orderId=trim((string)($_GET['order_id'] ?? ''));
    if ($orderId==='') intl_json(['success'=>false,'error'=>'Order ID is required.'],400);

    $pdo=getDBConnection();
    $stmt=$pdo->prepare("SELECT * FROM international_number_orders WHERE provider_order_id=? AND user_id=? LIMIT 1");
    $stmt->execute([$orderId,(int)$user['id']]);
    $row=$stmt->fetch();
    if (!$row) intl_json(['success'=>false,'error'=>'Order not found.'],404);

    $provider=intl_provider('sms/' . rawurlencode($orderId));
    if (!empty($provider['success'])) {
        [$normalized,$label,$code,$fullSms]=intl_sync_status($pdo,$row,$provider);

        if (in_array($normalized,['cancelled','refunded','expired'],true) && !$row['refunded']) {
            $pdo->beginTransaction();
            try {
                $fresh=$pdo->prepare("SELECT * FROM international_number_orders WHERE id=? FOR UPDATE");
                $fresh->execute([(int)$row['id']]);
                $locked=$fresh->fetch();
                if ($locked && !$locked['refunded']) {
                    $ref=intl_refund_locked($pdo,$locked,'International number ' . $normalized);
                    $pdo->prepare("UPDATE international_number_orders SET refunded=1,refund_transaction_reference=?,cancelled_at=IFNULL(cancelled_at,NOW()) WHERE id=?")
                        ->execute([$ref,(int)$row['id']]);
                }
                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
            }
        }
    }

    $stmt=$pdo->prepare("SELECT * FROM international_number_orders WHERE id=? LIMIT 1");
    $stmt->execute([(int)$row['id']]);
    $fresh=$stmt->fetch();
    intl_json(['success'=>true,'data'=>intl_order_row($fresh)]);
}

if ($route === 'cancel' && $method === 'POST') {
    $user=intl_user();
    $input=intl_input();
    $orderId=trim((string)($input['order_id'] ?? ''));
    if ($orderId==='') intl_json(['success'=>false,'error'=>'Order ID is required.'],400);

    $pdo=getDBConnection();
    $stmt=$pdo->prepare("SELECT * FROM international_number_orders WHERE provider_order_id=? AND user_id=? LIMIT 1");
    $stmt->execute([$orderId,(int)$user['id']]);
    $row=$stmt->fetch();
    if (!$row) intl_json(['success'=>false,'error'=>'Order not found.'],404);

    if ((int)$row['refunded']===1 || in_array($row['normalized_status'],['cancelled','refunded','expired'],true)) {
        intl_json(['success'=>true,'refunded'=>true,'data'=>intl_order_row($row)]);
    }

    if (in_array($row['normalized_status'],['received','completed'],true) || !empty($row['sms'])) {
        intl_json(['success'=>false,'error'=>'This number has already received a verification code and cannot be cancelled.'],400);
    }

    $provider=intl_provider('sms/' . rawurlencode($orderId) . '/cancel','POST',[]);
    $raw=strtolower((string)($provider['error'] ?? ''));

    if (empty($provider['success']) && !preg_match('/already cancelled|already canceled|refunded|expired|not active/', $raw)) {
        intl_json(['success'=>false,'error'=>'Unable to cancel the number right now. Please try again.'],502);
    }

    try {
        $pdo->beginTransaction();
        $fresh=$pdo->prepare("SELECT * FROM international_number_orders WHERE id=? FOR UPDATE");
        $fresh->execute([(int)$row['id']]);
        $locked=$fresh->fetch();

        if (!$locked['refunded']) {
            $ref=intl_refund_locked($pdo,$locked,'International number cancelled');
            $pdo->prepare("
                UPDATE international_number_orders
                SET normalized_status='cancelled',status_label='Cancelled (Refunded)',
                    provider_status='cancelled',provider_cancelled=1,refunded=1,
                    refund_transaction_reference=?,cancelled_at=NOW(),cancellation_pending=0,
                    last_sync=NOW(),last_checked=NOW(),updated_at=NOW()
                WHERE id=?
            ")->execute([$ref,(int)$row['id']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        intl_json(['success'=>false,'error'=>'Cancellation could not be completed.'],500);
    }

    $stmt=$pdo->prepare("SELECT * FROM international_number_orders WHERE id=?");
    $stmt->execute([(int)$row['id']]);
    intl_json(['success'=>true,'refunded'=>true,'data'=>intl_order_row($stmt->fetch())]);
}

if ($route === 'orders') {
    $user=intl_user();
    $pdo=getDBConnection();
    $stmt=$pdo->prepare("SELECT * FROM international_number_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100");
    $stmt->execute([(int)$user['id']]);
    $rows=$stmt->fetchAll();
    intl_json(['success'=>true,'data'=>array_map('intl_order_row',$rows)]);
}

if ($route === 'process-expired' && $method === 'POST') {
    $user=intl_user();
    $pdo=getDBConnection();

    $stmt=$pdo->prepare("
        SELECT * FROM international_number_orders
        WHERE user_id=?
          AND refunded=0
          AND normalized_status NOT IN ('received','completed','cancelled','refunded','expired')
          AND expires_at <= NOW()
        ORDER BY expires_at ASC
        LIMIT 20
    ");
    $stmt->execute([(int)$user['id']]);
    $rows=$stmt->fetchAll();

    $processed=0;
    foreach ($rows as $row) {
        $provider=intl_provider('sms/' . rawurlencode($row['provider_order_id']));
        if (!empty($provider['success'])) {
            [$normalized,$label,$code,$fullSms]=intl_sync_status($pdo,$row,$provider);
            if ($code) continue;
        }

        $cancel=intl_provider('sms/' . rawurlencode($row['provider_order_id']) . '/cancel','POST',[]);
        $raw=strtolower((string)($cancel['error'] ?? ''));
        if (empty($cancel['success']) && !preg_match('/already cancelled|already canceled|refunded|expired|not active/', $raw)) {
            $pdo->prepare("UPDATE international_number_orders SET cancellation_pending=1,cancellation_attempts=cancellation_attempts+1,cancellation_error=?,last_checked=NOW() WHERE id=?")
                ->execute([substr((string)($cancel['error'] ?? 'Cancellation failed'),0,1000),(int)$row['id']]);
            continue;
        }

        try {
            $pdo->beginTransaction();
            $fresh=$pdo->prepare("SELECT * FROM international_number_orders WHERE id=? FOR UPDATE");
            $fresh->execute([(int)$row['id']]);
            $locked=$fresh->fetch();

            if ($locked && !$locked['refunded']) {
                $ref=intl_refund_locked($pdo,$locked,'International number expired');
                $pdo->prepare("
                    UPDATE international_number_orders
                    SET normalized_status='expired',status_label='Expired',
                        provider_status='cancelled',provider_cancelled=1,refunded=1,
                        refund_transaction_reference=?,cancelled_at=NOW(),
                        cancellation_pending=0,last_sync=NOW(),last_checked=NOW()
                    WHERE id=?
                ")->execute([$ref,(int)$row['id']]);
            }
            $pdo->commit();
            $processed++;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
        }
    }

    intl_json(['success'=>true,'processed'=>$processed]);
}

intl_json(['success'=>false,'error'=>'International Numbers endpoint not found.'],404);
