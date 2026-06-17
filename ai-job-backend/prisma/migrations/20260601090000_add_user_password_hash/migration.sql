-- 只保存 bcrypt 密码哈希。可空用于兼容认证功能上线前的测试用户。
ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT;
