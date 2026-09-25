-- Surest Plug - Digital Marketplace Complete Database Schema
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB (InfinityFree PHP & MySQL)

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `firebase_uid` VARCHAR(128) NULL UNIQUE,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NULL,
  `phone` VARCHAR(30) NULL,
  `google_id` VARCHAR(191) NULL UNIQUE,
  `profile_image` VARCHAR(255) DEFAULT 'assets/images/sp-logo.png',
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `account_status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  `referral_code` VARCHAR(30) NULL UNIQUE,
  `referral_unlocked` TINYINT(1) NOT NULL DEFAULT 0,
  `referred_by` INT UNSIGNED NULL,
  `referred_by_code` VARCHAR(30) NULL,
  `welcome_seen` TINYINT(1) NOT NULL DEFAULT 0,
  `admin_welcome_seen` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_firebase_uid` (`firebase_uid`),
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_referral_code` (`referral_code`),
  INDEX `idx_referred_by` (`referred_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `products`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `category` ENUM('ready_made_website', 'custom_website', 'boosting', 'numbers', 'accounts') NOT NULL DEFAULT 'ready_made_website',
  `description` TEXT NOT NULL,
  `price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `image` LONGTEXT NOT NULL,
  `preview_image_path` VARCHAR(255) NULL,
  `demo_url` VARCHAR(255) NULL,
  `admin_email` VARCHAR(191) NULL,
  `admin_password` VARCHAR(255) NULL,
  `website_zip_path` VARCHAR(255) NULL,
  `website_zip_name` VARCHAR(200) NULL,
  `website_zip_size` BIGINT UNSIGNED NULL DEFAULT 0,
  `website_zip_data` LONGTEXT NULL,
  `features` TEXT NULL, -- JSON array string or newline-separated features
  `availability` ENUM('available', 'out_of_stock') NOT NULL DEFAULT 'available',
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `delivery_time` VARCHAR(100) NOT NULL DEFAULT 'Instant ZIP Delivery',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_featured` (`featured`),
  INDEX `idx_availability` (`availability`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `orders`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_reference` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `status` ENUM('pending', 'processing', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  `payment_status` ENUM('paid', 'unpaid', 'refunded') NOT NULL DEFAULT 'paid',
  `customer_details` LONGTEXT NULL, -- JSON string with credentials, zip info, smm params
  `admin_note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order_ref` (`order_reference`),
  INDEX `idx_user_orders` (`user_id`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `transactions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `type` ENUM('deposit', 'purchase', 'refund', 'admin_credit', 'admin_debit', 'referral_reward') NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `balance_before` DECIMAL(15, 2) NOT NULL,
  `balance_after` DECIMAL(15, 2) NOT NULL,
  `reference` VARCHAR(60) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_tx` (`user_id`),
  INDEX `idx_ref` (`reference`),
  CONSTRAINT `fk_tx_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `referrals`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `referrals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `referrer_user_id` INT UNSIGNED NOT NULL,
  `referred_user_id` INT UNSIGNED NOT NULL UNIQUE,
  `referral_code` VARCHAR(30) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_referrer` (`referrer_user_id`),
  INDEX `idx_referred` (`referred_user_id`),
  INDEX `idx_ref_code` (`referral_code`),
  CONSTRAINT `fk_ref_referrer` FOREIGN KEY (`referrer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ref_referred` FOREIGN KEY (`referred_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `referral_rewards`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `referral_rewards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` INT UNSIGNED NOT NULL,
  `referrer_user_id` INT UNSIGNED NOT NULL,
  `referred_user_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 10000.00,
  `status` ENUM('credited', 'pending') NOT NULL DEFAULT 'credited',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_rew_order` (`order_id`),
  INDEX `idx_rew_referrer` (`referrer_user_id`),
  CONSTRAINT `fk_rew_referrer` FOREIGN KEY (`referrer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rew_referred` FOREIGN KEY (`referred_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `deposits`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `deposits` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `deposit_reference` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `payment_reference` VARCHAR(100) NULL,
  `proof_image` LONGTEXT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_note` TEXT NULL,
  `reviewed_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_deposits` (`user_id`),
  INDEX `idx_deposit_status` (`status`),
  CONSTRAINT `fk_deposits_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `custom_orders`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_reference` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT UNSIGNED NOT NULL,
  `project_name` VARCHAR(150) NOT NULL,
  `website_type` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `required_features` TEXT NOT NULL,
  `pages_count` VARCHAR(50) NULL,
  `budget` VARCHAR(100) NOT NULL,
  `deadline` VARCHAR(50) NOT NULL,
  `contact_information` TEXT NOT NULL,
  `status` ENUM('pending', 'reviewing', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `admin_note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_custom` (`user_id`),
  INDEX `idx_custom_status` (`status`),
  CONSTRAINT `fk_custom_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `support_tickets`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_code` VARCHAR(30) NOT NULL UNIQUE,
  `user_id` INT UNSIGNED NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('open', 'in_progress', 'answered', 'closed') NOT NULL DEFAULT 'open',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_tickets` (`user_id`),
  INDEX `idx_ticket_status` (`status`),
  CONSTRAINT `fk_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `support_messages`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` INT UNSIGNED NOT NULL,
  `sender_id` INT UNSIGNED NOT NULL,
  `sender_role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `message_type` ENUM('text', 'voice') NOT NULL DEFAULT 'text',
  `message` TEXT NOT NULL,
  `audio_path` VARCHAR(255) NULL,
  `audio_data` LONGTEXT NULL,
  `audio_duration` INT UNSIGNED NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ticket_messages` (`ticket_id`),
  CONSTRAINT `fk_messages_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `site_updates`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_updates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `image` LONGTEXT NULL,
  `link` VARCHAR(255) NULL,
  `status` ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_update_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `notifications`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('order', 'deposit', 'wallet', 'support', 'system', 'referral', 'product', 'update') NOT NULL DEFAULT 'system',
  `reference_id` VARCHAR(50) NULL,
  `link_route` VARCHAR(100) NULL,
  `read_status` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_notif` (`user_id`),
  INDEX `idx_read` (`read_status`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `international_number_orders`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `international_number_orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider_order_id` VARCHAR(100) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `order_reference` VARCHAR(50) NOT NULL UNIQUE,
  `country_id` VARCHAR(30) NOT NULL,
  `country_name` VARCHAR(120) NULL,
  `service_id` VARCHAR(30) NOT NULL,
  `service_name` VARCHAR(120) NULL,
  `phone_number` VARCHAR(50) NOT NULL,
  `cost_usd` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
  `supplier_cost_ngn` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `customer_price` DECIMAL(15, 2) NOT NULL,
  `profit_ngn` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `provider_status` VARCHAR(50) NOT NULL DEFAULT 'waiting',
  `normalized_status` VARCHAR(30) NOT NULL DEFAULT 'waiting',
  `status_label` VARCHAR(100) NOT NULL DEFAULT 'Waiting for verification code...',
  `sms` VARCHAR(50) NULL,
  `full_sms` TEXT NULL,
  `purchased_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  `received_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  `provider_cancelled` TINYINT(1) NOT NULL DEFAULT 0,
  `cancellation_pending` TINYINT(1) NOT NULL DEFAULT 0,
  `cancellation_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `cancellation_error` TEXT NULL,
  `refunded` TINYINT(1) NOT NULL DEFAULT 0,
  `refund_transaction_reference` VARCHAR(60) NULL,
  `last_sync` DATETIME NULL,
  `last_checked` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_intl_provider_order` (`provider_order_id`),
  INDEX `idx_intl_user` (`user_id`),
  INDEX `idx_intl_status` (`normalized_status`),
  INDEX `idx_intl_expiry` (`expires_at`),
  INDEX `idx_intl_pending_cancel` (`cancellation_pending`),
  INDEX `idx_intl_refunded` (`refunded`),
  CONSTRAINT `fk_intl_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `system_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(60) NOT NULL UNIQUE,
  `setting_value` TEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed system configuration (Settings only, NO fake products, users or transactions)
INSERT INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('site_name', 'Surest Plug'),
('site_tagline', 'Your Plug for Websites, Social Media & Digital Services'),
('currency_symbol', '₦'),
('currency_code', 'NGN'),
('whatsapp_number', '+2348141853557'),
('support_email', 'chinonsochinix@gmail.com'),
('bank_name', 'OPAY BANK'),
('bank_account_number', '8141853557'),
('bank_account_name', 'CHINONSO MONDAY'),
('followspanel_api_url', 'https://followspanel.com/api/v2'),
('followspanel_api_key', '')
ON DUPLICATE KEY UPDATE `setting_key` = VALUES(`setting_key`);

COMMIT;
