<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/inc/prerequisites.inc.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('Location: https://qrzmail.com/login');
  exit;
}

$email = strtolower(trim($_POST['email'] ?? ''));
$password = $_POST['password'] ?? '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
  header('Location: https://qrzmail.com/login?error=invalid');
  exit;
}

$login_check = check_login($email, $password, array(
  'role' => 'user',
  'service' => 'MAILCOWUI',
));

if ($login_check === 'user') {
  set_user_loggedin_session($email);
  header('Location: /SOGo/so/');
  exit;
}

header('Location: https://qrzmail.com/login?error=failed');
exit;
