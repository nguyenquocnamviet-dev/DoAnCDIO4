-- ==============================================================================
-- COFFEE JOURNEY DATABASE - BẢN SAO LƯU TOÀN DIỆN & KHÔI PHỤC TẤT CẢ TRONG MỘT
-- Đầy đủ: Schema, Types, Tables, Sequences, Data (163 rows), Constraints,
--         Foreign Keys, Triggers, RLS Policies (Full Access), Realtime & Grants
-- Hướng dẫn: Chỉ cần mở tab SQL Editor trên Supabase, dán toàn bộ và bấm RUN
-- ==============================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- Kích hoạt extension bắt buộc
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ==============================================================================
-- 1. XÓA SẠCH DỮ LIỆU CŨ NẾU CÓ (Đảm bảo chạy lại nhiều lần không lỗi)
-- ==============================================================================
DROP TABLE IF EXISTS public.chitiettopping CASCADE;
DROP TABLE IF EXISTS public.chitietdonhang CASCADE;
DROP TABLE IF EXISTS public.thanhtoan CASCADE;
DROP TABLE IF EXISTS public.danhgia CASCADE;
DROP TABLE IF EXISTS public.datban CASCADE;
DROP TABLE IF EXISTS public.donhang CASCADE;
DROP TABLE IF EXISTS public.chitietnhapkho CASCADE;
DROP TABLE IF EXISTS public.phieunhapkho CASCADE;
DROP TABLE IF EXISTS public.chitietxuatkho CASCADE;
DROP TABLE IF EXISTS public.phieuxuatkho CASCADE;
DROP TABLE IF EXISTS public.congthucphache CASCADE;
DROP TABLE IF EXISTS public.sanphamtopping CASCADE;
DROP TABLE IF EXISTS public.sanphamsize CASCADE;
DROP TABLE IF EXISTS public.sanpham CASCADE;
DROP TABLE IF EXISTS public.danhmuc CASCADE;
DROP TABLE IF EXISTS public.topping CASCADE;
DROP TABLE IF EXISTS public.ban CASCADE;
DROP TABLE IF EXISTS public.phancongcalam CASCADE;
DROP TABLE IF EXISTS public.calamviec CASCADE;
DROP TABLE IF EXISTS public.lichsukho CASCADE;
DROP TABLE IF EXISTS public.nguyenlieu CASCADE;
DROP TABLE IF EXISTS public.lichsuhanhvi CASCADE;
DROP TABLE IF EXISTS public.nhatkyhoatdong CASCADE;
DROP TABLE IF EXISTS public.thongbao CASCADE;
DROP TABLE IF EXISTS public.voucherkhachhang CASCADE;
DROP TABLE IF EXISTS public.voucher CASCADE;
DROP TABLE IF EXISTS public.loaidonhang CASCADE;
DROP TABLE IF EXISTS public.hr_shifts CASCADE;
DROP TABLE IF EXISTS public.hr_staff_types CASCADE;
DROP TABLE IF EXISTS public.hr_timeclock CASCADE;
DROP TABLE IF EXISTS public.hr_settings CASCADE;
DROP TABLE IF EXISTS public.nguoidung CASCADE;
DROP TABLE IF EXISTS public.hangthanhvien CASCADE;
DROP TABLE IF EXISTS public.vaitro CASCADE;

-- ==============================================================================
-- 2. KHỞI TẠO CÁC KIỂU ENUM DỮ LIỆU
-- ==============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loai_hanh_vi') THEN
        CREATE TYPE public.loai_hanh_vi AS ENUM ('XemSanPham', 'ThemGioHang', 'DatHang', 'DanhGia', 'TimKiem');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loai_thao_tac_kho') THEN
        CREATE TYPE public.loai_thao_tac_kho AS ENUM ('NhapKho', 'XuatKho', 'Huy', 'KiemKe');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_ban') THEN
        CREATE TYPE public.trang_thai_ban AS ENUM ('Trong', 'DangDung', 'DaDat', 'BaoTri');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_chi_tiet_don_hang') THEN
        CREATE TYPE public.trang_thai_chi_tiet_don_hang AS ENUM ('ChoPhaChe', 'DangPhaChe', 'HoanThanh', 'DaGiao');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_dat_ban') THEN
        CREATE TYPE public.trang_thai_dat_ban AS ENUM ('ChoXacNhan', 'DaXacNhan', 'DaHuy', 'HoanThanh');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_don_hang') THEN
        CREATE TYPE public.trang_thai_don_hang AS ENUM ('ChoXacNhan', 'DangPhaChe', 'DangGiao', 'HoanThanh', 'DaHuy');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_nguoi_dung') THEN
        CREATE TYPE public.trang_thai_nguoi_dung AS ENUM ('HoatDong', 'BiKhoa', 'TamNgung');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_thanh_toan') THEN
        CREATE TYPE public.trang_thai_thanh_toan AS ENUM ('ChoThanhToan', 'DaThanhToan', 'ThatBai', 'HoanTien');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_voucher') THEN
        CREATE TYPE public.trang_thai_voucher AS ENUM ('HoatDong', 'TamDung', 'HetHan');
    END IF;
END $$;

-- ==============================================================================
-- 3. HÀM HỆ THỐNG
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."NgayCapNhat" = now();
    RETURN NEW;
END;
$$;

-- ==============================================================================
-- 4. KHỞI TẠO SEQUENCES
-- ==============================================================================
CREATE SEQUENCE IF NOT EXISTS public."ban_BanID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."calamviec_CaLamViecID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."chitietdonhang_ChiTietDonHangID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."congthucphache_CongThucID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."danhgia_DanhGiaID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."danhmuc_DanhMucID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."datban_DatBanID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."donhang_DonHangID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."hangthanhvien_HangThanhVienID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."lichsuhanhvi_LichSuHanhViID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."lichsukho_LichSuKhoID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."loaidonhang_LoaiDonHangID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."nguoidung_NguoiDungID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."nguyenlieu_NguyenLieuID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."nhatkyhoatdong_NhatKyID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."phancongcalam_PhanCongID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."sanpham_SanPhamID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."sanphamsize_SanPhamSizeID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."thanhtoan_ThanhToanID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."thongbao_ThongBaoID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."topping_ToppingID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."vaitro_VaiTroID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."voucher_VoucherID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- ==============================================================================
-- 5. TẠO CẤU TRÚC 34 BẢNG DỮ LIỆU
-- ==============================================================================
CREATE TABLE public.ban (
    "BanID" integer NOT NULL,
    "TenBan" character varying(50) NOT NULL,
    "SucChua" integer NOT NULL,
    "QRCode" character varying(255),
    "TrangThai" character varying(20) DEFAULT 'Trong'::character varying,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "ToaDoX" character varying(10) DEFAULT '50%'::character varying,
    "ToaDoY" character varying(10) DEFAULT '50%'::character varying
);

CREATE TABLE public.calamviec (
    "CaLamViecID" integer NOT NULL,
    "TenCa" character varying(50),
    "GioBatDau" time without time zone,
    "GioKetThuc" time without time zone,
    "MoTa" text
);

CREATE TABLE public.chitietdonhang (
    "ChiTietDonHangID" integer NOT NULL,
    "DonHangID" integer,
    "SanPhamSizeID" integer,
    "SoLuong" integer,
    "DonGia" numeric(10,2),
    "ThanhTien" numeric(12,2),
    "GhiChu" text,
    "TrangThai" character varying(20) DEFAULT 'ChoPhaChe'::character varying
);

CREATE TABLE public.chitietnhapkho (
    "ChiTietID" uuid DEFAULT gen_random_uuid() NOT NULL,
    "PhieuNhapID" uuid,
    "NguyenLieuID" integer,
    "SoLuong" numeric NOT NULL
);

CREATE TABLE public.chitiettopping (
    "ChiTietDonHangID" integer NOT NULL,
    "ToppingID" integer NOT NULL
);

CREATE TABLE public.chitietxuatkho (
    "ChiTietID" uuid DEFAULT gen_random_uuid() NOT NULL,
    "PhieuXuatID" uuid,
    "NguyenLieuID" integer,
    "SoLuong" numeric NOT NULL
);

CREATE TABLE public.congthucphache (
    "CongThucID" integer NOT NULL,
    "SanPhamID" integer,
    "NguyenLieuID" integer,
    "SoLuongCan" numeric(10,2),
    "DonViTinh" character varying(20),
    "PhienBan" integer DEFAULT 1
);

CREATE TABLE public.danhgia (
    "DanhGiaID" integer NOT NULL,
    "KhachHangID" integer,
    "SanPhamID" integer,
    "DonHangID" integer,
    "SoSao" integer,
    "BinhLuan" text,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "danhgia_SoSao_check" CHECK ((("SoSao" >= 1) AND ("SoSao" <= 5)))
);

CREATE TABLE public.danhmuc (
    "DanhMucID" integer NOT NULL,
    "TenDanhMuc" character varying(100) NOT NULL,
    "MoTa" text,
    "DaXoa" boolean DEFAULT false,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.datban (
    "DatBanID" integer NOT NULL,
    "KhachHangID" integer,
    "BanID" integer,
    "ThoiGianDat" timestamp with time zone NOT NULL,
    "SoNguoi" integer,
    "GhiChu" text,
    "TrangThai" character varying(20) DEFAULT 'ChoXacNhan'::character varying,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.donhang (
    "DonHangID" integer NOT NULL,
    "MaDonHang" character varying(50),
    "KhachHangID" integer,
    "NhanVienID" integer,
    "BanID" integer,
    "TongTien" numeric(12,2) DEFAULT 0.00,
    "GiamGia" numeric(12,2) DEFAULT 0.00,
    "ThanhTien" numeric(12,2) DEFAULT 0.00,
    "DiemCongThem" integer DEFAULT 0,
    "DiemSuDung" integer DEFAULT 0,
    "PhuongThucThanhToan" character varying(30),
    "TrangThai" character varying(20) DEFAULT 'ChoXacNhan'::character varying,
    "GhiChu" text,
    "VoucherID" integer,
    "LoaiDonHangID" integer,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.hangthanhvien (
    "HangThanhVienID" integer NOT NULL,
    "TenHang" character varying(50),
    "DiemToiThieu" integer DEFAULT 0,
    "PhanTramGiam" numeric(5,2) DEFAULT 0.00
);

CREATE TABLE public.hr_settings (
    key text NOT NULL,
    value text
);

CREATE TABLE public.hr_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_of_week text NOT NULL,
    shift_id text NOT NULL,
    user_id bigint NOT NULL,
    user_name text,
    user_role text
);

CREATE TABLE public.hr_staff_types (
    user_id bigint NOT NULL,
    staff_type text NOT NULL
);

CREATE TABLE public.hr_timeclock (
    id text NOT NULL,
    user_id bigint NOT NULL,
    user_name text,
    shift_id text,
    shift_name text,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    check_in_status text,
    check_out_status text,
    total_hours numeric,
    date_str text
);

CREATE TABLE public.lichsuhanhvi (
    "LichSuHanhViID" integer NOT NULL,
    "KhachHangID" integer,
    "LoaiHanhVi" character varying(50),
    "SanPhamID" integer,
    "ThoiGian" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.lichsukho (
    "LichSuKhoID" integer NOT NULL,
    "NguyenLieuID" integer,
    "SoLuongTruoc" numeric(10,2),
    "SoLuongThayDoi" numeric(10,2),
    "SoLuongSau" numeric(10,2),
    "LoaiThaoTac" character varying(50),
    "GhiChu" text,
    "NguoiTaoID" integer,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.loaidonhang (
    "LoaiDonHangID" integer NOT NULL,
    "TenLoaiDonHang" character varying(50) NOT NULL
);

CREATE TABLE public.nguoidung (
    "NguoiDungID" integer NOT NULL,
    "VaiTroID" integer DEFAULT 6,
    "HoTen" character varying(100) NOT NULL,
    "TenDangNhap" character varying(50),
    "Email" character varying(100),
    "SoDienThoai" character varying(20),
    "MatKhau" character varying(255) NOT NULL,
    "AnhDaiDien" character varying(255),
    "GioiTinh" character varying(10),
    "NgaySinh" date,
    "DiaChi" text,
    "TrangThai" character varying(20) DEFAULT 'HoatDong'::character varying,
    "TongDiem" integer DEFAULT 0,
    "HangThanhVienID" integer DEFAULT 1,
    "DaXoa" boolean DEFAULT false,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.nguyenlieu (
    "NguyenLieuID" integer NOT NULL,
    "TenNguyenLieu" character varying(100) NOT NULL,
    "DonViTinh" character varying(20),
    "SoLuongTon" numeric(10,2) DEFAULT 0.00,
    "SoLuongToiThieu" numeric(10,2) DEFAULT 0.00,
    "GiaNhap" numeric(10,2),
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.nhatkyhoatdong (
    "NhatKyID" integer NOT NULL,
    "NguoiDungID" integer,
    "HanhDong" character varying(255),
    "BangTacDong" character varying(100),
    "DuLieuCu" jsonb,
    "DuLieuMoi" jsonb,
    "ThoiGian" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.phancongcalam (
    "PhanCongID" integer NOT NULL,
    "NhanVienID" integer,
    "CaLamViecID" integer,
    "NgayLam" date,
    "TrangThai" character varying(20) DEFAULT 'DaPhanCong'::character varying,
    "GioCheckIn" timestamp with time zone,
    "GioCheckOut" timestamp with time zone,
    "SoGioLam" numeric(5,2),
    "GhiChu" text,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.phieunhapkho (
    "PhieuNhapID" uuid DEFAULT gen_random_uuid() NOT NULL,
    "NgayTao" timestamp with time zone DEFAULT now(),
    "GhiChu" text
);

CREATE TABLE public.phieuxuatkho (
    "PhieuXuatID" uuid DEFAULT gen_random_uuid() NOT NULL,
    "NgayTao" timestamp with time zone DEFAULT now(),
    "GhiChu" text,
    "DonHangID" integer
);

CREATE TABLE public.sanpham (
    "SanPhamID" integer NOT NULL,
    "DanhMucID" integer,
    "TenSanPham" character varying(150) NOT NULL,
    "MoTa" text,
    "HinhAnh" character varying(255),
    "ConBan" boolean DEFAULT true,
    "NoiBat" boolean DEFAULT false,
    "DaXoa" boolean DEFAULT false,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.sanphamsize (
    "SanPhamSizeID" integer NOT NULL,
    "SanPhamID" integer,
    "KichThuoc" character varying(5),
    "Gia" numeric(10,2) NOT NULL,
    "Calories" integer,
    CONSTRAINT "sanphamsize_KichThuoc_check" CHECK ((("KichThuoc")::text = ANY ((ARRAY['S'::character varying, 'M'::character varying, 'L'::character varying])::text[])))
);

CREATE TABLE public.sanphamtopping (
    "SanPhamID" integer NOT NULL,
    "ToppingID" integer NOT NULL
);

CREATE TABLE public.thanhtoan (
    "ThanhToanID" integer NOT NULL,
    "DonHangID" integer,
    "MaThanhToan" character varying(100),
    "SoTien" numeric(12,2),
    "PhuongThucThanhToan" character varying(30),
    "TrangThai" character varying(20) DEFAULT 'ChoThanhToan'::character varying,
    "MaGiaoDich" character varying(255),
    "ThoiGianThanhToan" timestamp with time zone,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.thongbao (
    "ThongBaoID" integer NOT NULL,
    "NguoiDungID" integer,
    "TieuDe" character varying(255),
    "NoiDung" text,
    "DaDoc" boolean DEFAULT false,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.topping (
    "ToppingID" integer NOT NULL,
    "TenTopping" character varying(100) NOT NULL,
    "Gia" numeric(10,2) NOT NULL,
    "DaXoa" boolean DEFAULT false,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.vaitro (
    "VaiTroID" integer NOT NULL,
    "TenVaiTro" character varying(50) NOT NULL,
    "MoTa" character varying(255)
);

CREATE TABLE public.voucher (
    "VoucherID" integer NOT NULL,
    "MaVoucher" character varying(50),
    "TenVoucher" character varying(100),
    "LoaiGiamGia" character varying(20),
    "GiaTriGiam" numeric(10,2),
    "GiaTriGiamToiDa" numeric(10,2),
    "DonHangToiThieu" numeric(10,2),
    "SoLuong" integer,
    "SoLanDungToiDa" integer DEFAULT 1,
    "NgayBatDau" timestamp with time zone,
    "NgayKetThuc" timestamp with time zone,
    "TrangThai" character varying(20) DEFAULT 'HoatDong'::character varying,
    "DaXoa" boolean DEFAULT false,
    "NgayTao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.voucherkhachhang (
    "KhachHangID" integer NOT NULL,
    "VoucherID" integer NOT NULL,
    "DaSuDung" boolean DEFAULT false,
    "NgaySuDung" timestamp with time zone
);

-- ==============================================================================
-- 6. GÁN SEQUENCE CHO CÁC KHÓA CHÍNH TỰ TĂNG
-- ==============================================================================
ALTER SEQUENCE public."ban_BanID_seq" OWNED BY public.ban."BanID";
ALTER SEQUENCE public."calamviec_CaLamViecID_seq" OWNED BY public.calamviec."CaLamViecID";
ALTER SEQUENCE public."chitietdonhang_ChiTietDonHangID_seq" OWNED BY public.chitietdonhang."ChiTietDonHangID";
ALTER SEQUENCE public."congthucphache_CongThucID_seq" OWNED BY public.congthucphache."CongThucID";
ALTER SEQUENCE public."danhgia_DanhGiaID_seq" OWNED BY public.danhgia."DanhGiaID";
ALTER SEQUENCE public."danhmuc_DanhMucID_seq" OWNED BY public.danhmuc."DanhMucID";
ALTER SEQUENCE public."datban_DatBanID_seq" OWNED BY public.datban."DatBanID";
ALTER SEQUENCE public."donhang_DonHangID_seq" OWNED BY public.donhang."DonHangID";
ALTER SEQUENCE public."hangthanhvien_HangThanhVienID_seq" OWNED BY public.hangthanhvien."HangThanhVienID";
ALTER SEQUENCE public."lichsuhanhvi_LichSuHanhViID_seq" OWNED BY public.lichsuhanhvi."LichSuHanhViID";
ALTER SEQUENCE public."lichsukho_LichSuKhoID_seq" OWNED BY public.lichsukho."LichSuKhoID";
ALTER SEQUENCE public."loaidonhang_LoaiDonHangID_seq" OWNED BY public.loaidonhang."LoaiDonHangID";
ALTER SEQUENCE public."nguoidung_NguoiDungID_seq" OWNED BY public.nguoidung."NguoiDungID";
ALTER SEQUENCE public."nguyenlieu_NguyenLieuID_seq" OWNED BY public.nguyenlieu."NguyenLieuID";
ALTER SEQUENCE public."nhatkyhoatdong_NhatKyID_seq" OWNED BY public.nhatkyhoatdong."NhatKyID";
ALTER SEQUENCE public."phancongcalam_PhanCongID_seq" OWNED BY public.phancongcalam."PhanCongID";
ALTER SEQUENCE public."sanpham_SanPhamID_seq" OWNED BY public.sanpham."SanPhamID";
ALTER SEQUENCE public."sanphamsize_SanPhamSizeID_seq" OWNED BY public.sanphamsize."SanPhamSizeID";
ALTER SEQUENCE public."thanhtoan_ThanhToanID_seq" OWNED BY public.thanhtoan."ThanhToanID";
ALTER SEQUENCE public."thongbao_ThongBaoID_seq" OWNED BY public.thongbao."ThongBaoID";
ALTER SEQUENCE public."topping_ToppingID_seq" OWNED BY public.topping."ToppingID";
ALTER SEQUENCE public."vaitro_VaiTroID_seq" OWNED BY public.vaitro."VaiTroID";
ALTER SEQUENCE public."voucher_VoucherID_seq" OWNED BY public.voucher."VoucherID";
ALTER TABLE ONLY public.ban ALTER COLUMN "BanID" SET DEFAULT nextval('public."ban_BanID_seq"'::regclass);
ALTER TABLE ONLY public.calamviec ALTER COLUMN "CaLamViecID" SET DEFAULT nextval('public."calamviec_CaLamViecID_seq"'::regclass);
ALTER TABLE ONLY public.chitietdonhang ALTER COLUMN "ChiTietDonHangID" SET DEFAULT nextval('public."chitietdonhang_ChiTietDonHangID_seq"'::regclass);
ALTER TABLE ONLY public.congthucphache ALTER COLUMN "CongThucID" SET DEFAULT nextval('public."congthucphache_CongThucID_seq"'::regclass);
ALTER TABLE ONLY public.danhgia ALTER COLUMN "DanhGiaID" SET DEFAULT nextval('public."danhgia_DanhGiaID_seq"'::regclass);
ALTER TABLE ONLY public.danhmuc ALTER COLUMN "DanhMucID" SET DEFAULT nextval('public."danhmuc_DanhMucID_seq"'::regclass);
ALTER TABLE ONLY public.datban ALTER COLUMN "DatBanID" SET DEFAULT nextval('public."datban_DatBanID_seq"'::regclass);
ALTER TABLE ONLY public.donhang ALTER COLUMN "DonHangID" SET DEFAULT nextval('public."donhang_DonHangID_seq"'::regclass);
ALTER TABLE ONLY public.hangthanhvien ALTER COLUMN "HangThanhVienID" SET DEFAULT nextval('public."hangthanhvien_HangThanhVienID_seq"'::regclass);
ALTER TABLE ONLY public.lichsuhanhvi ALTER COLUMN "LichSuHanhViID" SET DEFAULT nextval('public."lichsuhanhvi_LichSuHanhViID_seq"'::regclass);
ALTER TABLE ONLY public.lichsukho ALTER COLUMN "LichSuKhoID" SET DEFAULT nextval('public."lichsukho_LichSuKhoID_seq"'::regclass);
ALTER TABLE ONLY public.loaidonhang ALTER COLUMN "LoaiDonHangID" SET DEFAULT nextval('public."loaidonhang_LoaiDonHangID_seq"'::regclass);
ALTER TABLE ONLY public.nguoidung ALTER COLUMN "NguoiDungID" SET DEFAULT nextval('public."nguoidung_NguoiDungID_seq"'::regclass);
ALTER TABLE ONLY public.nguyenlieu ALTER COLUMN "NguyenLieuID" SET DEFAULT nextval('public."nguyenlieu_NguyenLieuID_seq"'::regclass);
ALTER TABLE ONLY public.nhatkyhoatdong ALTER COLUMN "NhatKyID" SET DEFAULT nextval('public."nhatkyhoatdong_NhatKyID_seq"'::regclass);
ALTER TABLE ONLY public.phancongcalam ALTER COLUMN "PhanCongID" SET DEFAULT nextval('public."phancongcalam_PhanCongID_seq"'::regclass);
ALTER TABLE ONLY public.sanpham ALTER COLUMN "SanPhamID" SET DEFAULT nextval('public."sanpham_SanPhamID_seq"'::regclass);
ALTER TABLE ONLY public.sanphamsize ALTER COLUMN "SanPhamSizeID" SET DEFAULT nextval('public."sanphamsize_SanPhamSizeID_seq"'::regclass);
ALTER TABLE ONLY public.thanhtoan ALTER COLUMN "ThanhToanID" SET DEFAULT nextval('public."thanhtoan_ThanhToanID_seq"'::regclass);
ALTER TABLE ONLY public.thongbao ALTER COLUMN "ThongBaoID" SET DEFAULT nextval('public."thongbao_ThongBaoID_seq"'::regclass);
ALTER TABLE ONLY public.topping ALTER COLUMN "ToppingID" SET DEFAULT nextval('public."topping_ToppingID_seq"'::regclass);
ALTER TABLE ONLY public.vaitro ALTER COLUMN "VaiTroID" SET DEFAULT nextval('public."vaitro_VaiTroID_seq"'::regclass);
ALTER TABLE ONLY public.voucher ALTER COLUMN "VoucherID" SET DEFAULT nextval('public."voucher_VoucherID_seq"'::regclass);

-- ==============================================================================
-- 7. THIẾT LẬP KHÓA CHÍNH (PRIMARY KEYS)
-- ==============================================================================
ALTER TABLE ONLY public.ban ADD CONSTRAINT "ban_pkey" PRIMARY KEY ("BanID");
ALTER TABLE ONLY public.calamviec ADD CONSTRAINT "calamviec_pkey" PRIMARY KEY ("CaLamViecID");
ALTER TABLE ONLY public.chitietdonhang ADD CONSTRAINT "chitietdonhang_pkey" PRIMARY KEY ("ChiTietDonHangID");
ALTER TABLE ONLY public.chitietnhapkho ADD CONSTRAINT "chitietnhapkho_pkey" PRIMARY KEY ("ChiTietID");
ALTER TABLE ONLY public.chitiettopping ADD CONSTRAINT "chitiettopping_pkey" PRIMARY KEY ("ChiTietDonHangID", "ToppingID");
ALTER TABLE ONLY public.chitietxuatkho ADD CONSTRAINT "chitietxuatkho_pkey" PRIMARY KEY ("ChiTietID");
ALTER TABLE ONLY public.congthucphache ADD CONSTRAINT "congthucphache_pkey" PRIMARY KEY ("CongThucID");
ALTER TABLE ONLY public.danhgia ADD CONSTRAINT "danhgia_pkey" PRIMARY KEY ("DanhGiaID");
ALTER TABLE ONLY public.danhmuc ADD CONSTRAINT "danhmuc_pkey" PRIMARY KEY ("DanhMucID");
ALTER TABLE ONLY public.datban ADD CONSTRAINT "datban_pkey" PRIMARY KEY ("DatBanID");
ALTER TABLE ONLY public.donhang ADD CONSTRAINT "donhang_pkey" PRIMARY KEY ("DonHangID");
ALTER TABLE ONLY public.hangthanhvien ADD CONSTRAINT "hangthanhvien_pkey" PRIMARY KEY ("HangThanhVienID");
ALTER TABLE ONLY public.hr_settings ADD CONSTRAINT "hr_settings_pkey" PRIMARY KEY (key);
ALTER TABLE ONLY public.hr_shifts ADD CONSTRAINT "hr_shifts_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.hr_staff_types ADD CONSTRAINT "hr_staff_types_pkey" PRIMARY KEY (user_id);
ALTER TABLE ONLY public.hr_timeclock ADD CONSTRAINT "hr_timeclock_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.lichsuhanhvi ADD CONSTRAINT "lichsuhanhvi_pkey" PRIMARY KEY ("LichSuHanhViID");
ALTER TABLE ONLY public.lichsukho ADD CONSTRAINT "lichsukho_pkey" PRIMARY KEY ("LichSuKhoID");
ALTER TABLE ONLY public.loaidonhang ADD CONSTRAINT "loaidonhang_pkey" PRIMARY KEY ("LoaiDonHangID");
ALTER TABLE ONLY public.nguoidung ADD CONSTRAINT "nguoidung_pkey" PRIMARY KEY ("NguoiDungID");
ALTER TABLE ONLY public.nguyenlieu ADD CONSTRAINT "nguyenlieu_pkey" PRIMARY KEY ("NguyenLieuID");
ALTER TABLE ONLY public.nhatkyhoatdong ADD CONSTRAINT "nhatkyhoatdong_pkey" PRIMARY KEY ("NhatKyID");
ALTER TABLE ONLY public.phancongcalam ADD CONSTRAINT "phancongcalam_pkey" PRIMARY KEY ("PhanCongID");
ALTER TABLE ONLY public.phieunhapkho ADD CONSTRAINT "phieunhapkho_pkey" PRIMARY KEY ("PhieuNhapID");
ALTER TABLE ONLY public.phieuxuatkho ADD CONSTRAINT "phieuxuatkho_pkey" PRIMARY KEY ("PhieuXuatID");
ALTER TABLE ONLY public.sanpham ADD CONSTRAINT "sanpham_pkey" PRIMARY KEY ("SanPhamID");
ALTER TABLE ONLY public.sanphamsize ADD CONSTRAINT "sanphamsize_pkey" PRIMARY KEY ("SanPhamSizeID");
ALTER TABLE ONLY public.sanphamtopping ADD CONSTRAINT "sanphamtopping_pkey" PRIMARY KEY ("SanPhamID", "ToppingID");
ALTER TABLE ONLY public.thanhtoan ADD CONSTRAINT "thanhtoan_pkey" PRIMARY KEY ("ThanhToanID");
ALTER TABLE ONLY public.thongbao ADD CONSTRAINT "thongbao_pkey" PRIMARY KEY ("ThongBaoID");
ALTER TABLE ONLY public.topping ADD CONSTRAINT "topping_pkey" PRIMARY KEY ("ToppingID");
ALTER TABLE ONLY public.vaitro ADD CONSTRAINT "vaitro_pkey" PRIMARY KEY ("VaiTroID");
ALTER TABLE ONLY public.voucher ADD CONSTRAINT "voucher_pkey" PRIMARY KEY ("VoucherID");
ALTER TABLE ONLY public.voucherkhachhang ADD CONSTRAINT "voucherkhachhang_pkey" PRIMARY KEY ("KhachHangID", "VoucherID");

-- ==============================================================================
-- 8. NẠP DỮ LIỆU ĐẦY ĐỦ (INSERT DATA)
-- ==============================================================================
-- Bảng: public.ban (10 bản ghi)
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (10, 'Bàn 10', 6, NULL, 'Trong', '2026-07-03 17:36:01.242037+00', '19.11%', '72.42%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (6, 'Bàn 5', 4, NULL, 'Trong', '2026-07-01 02:28:18.138368+00', '67.91%', '80.40%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (4, 'Bàn 4', 4, NULL, 'Trong', '2026-07-01 02:28:18.138368+00', '5.66%', '72.15%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (1, 'Bàn 1', 2, NULL, 'Trong', '2026-07-01 02:28:18.138368+00', '84.38%', '80.71%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (7, 'Bàn 6', 4, NULL, 'Trong', '2026-07-01 02:28:18.138368+00', '52.10%', '80.17%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (3, 'Bàn 3', 4, NULL, 'Trong', '2026-07-01 02:28:18.138368+00', '37.41%', '18.66%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (5, 'VIP 1', 6, NULL, 'DaDat', '2026-07-01 02:28:18.138368+00', '78.39%', '20.81%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (2, 'Bàn 2', 2, NULL, 'DaDat', '2026-07-01 02:28:18.138368+00', '50.11%', '19.19%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (8, 'Bàn 7', 4, NULL, 'Trong', '2026-07-01 02:28:18.138368+00', '92.90%', '20.54%');
INSERT INTO public.ban ("BanID", "TenBan", "SucChua", "QRCode", "TrangThai", "NgayTao", "ToaDoX", "ToaDoY") VALUES (11, 'Bàn 10', 6, NULL, 'Trong', '2026-07-09 05:50:54.920141+00', '41.84%', '46.70%');

-- Bảng: public.calamviec (2 bản ghi)
INSERT INTO public.calamviec ("CaLamViecID", "TenCa", "GioBatDau", "GioKetThuc", "MoTa") VALUES (1, 'Ca Sáng', '06:00:00', '14:00:00', 'Ca mở quán');
INSERT INTO public.calamviec ("CaLamViecID", "TenCa", "GioBatDau", "GioKetThuc", "MoTa") VALUES (2, 'Ca Chiều', '14:00:00', '22:00:00', 'Ca đóng quán');

-- Bảng: public.chitietdonhang (6 bản ghi)
INSERT INTO public.chitietdonhang ("ChiTietDonHangID", "DonHangID", "SanPhamSizeID", "SoLuong", "DonGia", "ThanhTien", "GhiChu", "TrangThai") VALUES (35, 31, 1, 1, 25000.00, 25000.00, '', 'ChoPhaChe');
INSERT INTO public.chitietdonhang ("ChiTietDonHangID", "DonHangID", "SanPhamSizeID", "SoLuong", "DonGia", "ThanhTien", "GhiChu", "TrangThai") VALUES (36, 32, 1, 1, 25000.00, 40000.00, 'Kem Macchiato, Trân châu đen', 'ChoPhaChe');
INSERT INTO public.chitietdonhang ("ChiTietDonHangID", "DonHangID", "SanPhamSizeID", "SoLuong", "DonGia", "ThanhTien", "GhiChu", "TrangThai") VALUES (37, 33, 16, 1, 45000.00, 60000.00, 'Trân châu đen', 'ChoPhaChe');
INSERT INTO public.chitietdonhang ("ChiTietDonHangID", "DonHangID", "SanPhamSizeID", "SoLuong", "DonGia", "ThanhTien", "GhiChu", "TrangThai") VALUES (38, 34, 1, 2, 25000.00, 80000.00, 'Kem Macchiato, Trân châu đen', 'ChoPhaChe');
INSERT INTO public.chitietdonhang ("ChiTietDonHangID", "DonHangID", "SanPhamSizeID", "SoLuong", "DonGia", "ThanhTien", "GhiChu", "TrangThai") VALUES (39, 35, 1, 1, 25000.00, 25000.00, '', 'ChoPhaChe');
INSERT INTO public.chitietdonhang ("ChiTietDonHangID", "DonHangID", "SanPhamSizeID", "SoLuong", "DonGia", "ThanhTien", "GhiChu", "TrangThai") VALUES (40, 36, 1, 1, 25000.00, 25000.00, '', 'ChoPhaChe');

-- Bảng: public.chitietnhapkho (6 bản ghi)
INSERT INTO public.chitietnhapkho ("ChiTietID", "PhieuNhapID", "NguyenLieuID", "SoLuong") VALUES ('23b518a5-be17-4bb4-b298-695d29ff3d70', '286be62f-4f6b-4e4a-9015-7407b58e0e93', 1, 1);
INSERT INTO public.chitietnhapkho ("ChiTietID", "PhieuNhapID", "NguyenLieuID", "SoLuong") VALUES ('81066f88-6725-4e67-b553-0f44dc04daba', 'eda6353f-4ede-4d55-90a6-8cb82e4584e6', 1, 20);
INSERT INTO public.chitietnhapkho ("ChiTietID", "PhieuNhapID", "NguyenLieuID", "SoLuong") VALUES ('87965190-47d7-471f-bd96-d513d59da849', 'eda6353f-4ede-4d55-90a6-8cb82e4584e6', 2, 3);
INSERT INTO public.chitietnhapkho ("ChiTietID", "PhieuNhapID", "NguyenLieuID", "SoLuong") VALUES ('1f802bff-e5ef-44cc-bda4-8f41ce3ba59c', 'eda6353f-4ede-4d55-90a6-8cb82e4584e6', 3, 25.1);
INSERT INTO public.chitietnhapkho ("ChiTietID", "PhieuNhapID", "NguyenLieuID", "SoLuong") VALUES ('a027cfc4-223e-4de6-b29e-3ad08e277f56', '5af22bde-e6a4-4305-a979-780589cc2aa0', 1, 5);
INSERT INTO public.chitietnhapkho ("ChiTietID", "PhieuNhapID", "NguyenLieuID", "SoLuong") VALUES ('3d37427e-d126-483e-93b2-edc36a8bd7b9', '5af22bde-e6a4-4305-a979-780589cc2aa0', 2, 10);

-- Bảng: public.chitiettopping (5 bản ghi)
INSERT INTO public.chitiettopping ("ChiTietDonHangID", "ToppingID") VALUES (36, 2);
INSERT INTO public.chitiettopping ("ChiTietDonHangID", "ToppingID") VALUES (36, 1);
INSERT INTO public.chitiettopping ("ChiTietDonHangID", "ToppingID") VALUES (37, 1);
INSERT INTO public.chitiettopping ("ChiTietDonHangID", "ToppingID") VALUES (38, 2);
INSERT INTO public.chitiettopping ("ChiTietDonHangID", "ToppingID") VALUES (38, 1);

-- Bảng: public.chitietxuatkho (7 bản ghi)
INSERT INTO public.chitietxuatkho ("ChiTietID", "PhieuXuatID", "NguyenLieuID", "SoLuong") VALUES ('7a58785c-6cc8-40c7-b227-505a92dab357', 'b73ce215-1d12-4fb0-93b1-26976daaaadf', 1, 20);
INSERT INTO public.chitietxuatkho ("ChiTietID", "PhieuXuatID", "NguyenLieuID", "SoLuong") VALUES ('50f11504-fc95-4dbb-b645-de6a60594c76', 'e30a398b-b3a7-41f6-bd79-2a6db48296ba', 1, 1);
INSERT INTO public.chitietxuatkho ("ChiTietID", "PhieuXuatID", "NguyenLieuID", "SoLuong") VALUES ('a9f3d500-26d6-4543-a7db-17c9fec392c5', 'e30a398b-b3a7-41f6-bd79-2a6db48296ba', 2, 1.2);
INSERT INTO public.chitietxuatkho ("ChiTietID", "PhieuXuatID", "NguyenLieuID", "SoLuong") VALUES ('dcacafea-a7fb-4686-95a9-fc8c099f5f84', '2bcf4e7a-945b-4431-8528-2ddf206487f9', 1, 2);
INSERT INTO public.chitietxuatkho ("ChiTietID", "PhieuXuatID", "NguyenLieuID", "SoLuong") VALUES ('79e61d98-b035-4c3e-a63b-030279db388e', '2bcf4e7a-945b-4431-8528-2ddf206487f9', 2, 2.4);
INSERT INTO public.chitietxuatkho ("ChiTietID", "PhieuXuatID", "NguyenLieuID", "SoLuong") VALUES ('d1602d42-cf5e-46ec-b675-7eefb4fb368f', '45ea1813-c3c9-4f70-9ef2-889dae5731ff', 1, 1);
INSERT INTO public.chitietxuatkho ("ChiTietID", "PhieuXuatID", "NguyenLieuID", "SoLuong") VALUES ('73795dc7-fde8-4791-adc2-58b99dc867d9', '45ea1813-c3c9-4f70-9ef2-889dae5731ff', 2, 1.2);

-- Bảng: public.congthucphache (16 bản ghi)
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (6, 1, 1, 1.00, 'muỗng', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (7, 1, 2, 1.20, 'ml', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (8, 3, 4, 3.00, 'g', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (9, 14, 5, 10.00, 'Gói', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (10, 14, 4, 10.00, 'Hộp', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (11, 15, 7, 10.00, 'kg', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (12, 15, 6, 10.00, 'kg', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (13, 16, 10, 10.00, 'kg', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (14, 16, 9, 10.00, 'lít', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (15, 16, 3, 10.00, 'Hộp', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (16, 17, 5, 10.00, 'Gói', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (17, 17, 2, 10.00, 'Lít', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (18, 18, 11, 10.00, 'kg', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (19, 18, 12, 10.00, 'g', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (22, 19, 14, 10.00, 'ml', 1);
INSERT INTO public.congthucphache ("CongThucID", "SanPhamID", "NguyenLieuID", "SoLuongCan", "DonViTinh", "PhienBan") VALUES (23, 19, 13, 1.00, 'lít', 1);

-- Bảng: public.danhmuc (3 bản ghi)
INSERT INTO public.danhmuc ("DanhMucID", "TenDanhMuc", "MoTa", "DaXoa", "NgayTao") VALUES (1, 'Cà Phê', 'Các loại cà phê thơm ngon', FALSE, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.danhmuc ("DanhMucID", "TenDanhMuc", "MoTa", "DaXoa", "NgayTao") VALUES (2, 'Trà', 'Các món trà thanh mát giải nhiệt', FALSE, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.danhmuc ("DanhMucID", "TenDanhMuc", "MoTa", "DaXoa", "NgayTao") VALUES (3, 'Bánh', 'Bánh ngọt ăn kèm hấp dẫn', FALSE, '2026-07-01 02:28:18.138368+00');

-- Bảng: public.datban (3 bản ghi)
INSERT INTO public.datban ("DatBanID", "KhachHangID", "BanID", "ThoiGianDat", "SoNguoi", "GhiChu", "TrangThai", "NgayTao") VALUES (14, 18, 2, '2026-07-15 16:50:00+00', 2, '', 'DaXacNhan', '2026-07-15 01:50:28.831793+00');
INSERT INTO public.datban ("DatBanID", "KhachHangID", "BanID", "ThoiGianDat", "SoNguoi", "GhiChu", "TrangThai", "NgayTao") VALUES (15, 18, 5, '2026-07-27 17:51:00+00', 6, '', 'DaXacNhan', '2026-07-15 01:51:15.934185+00');
INSERT INTO public.datban ("DatBanID", "KhachHangID", "BanID", "ThoiGianDat", "SoNguoi", "GhiChu", "TrangThai", "NgayTao") VALUES (16, 18, 2, '2026-07-26 13:49:00+00', 2, '', 'DaXacNhan', '2026-07-25 10:54:43.753312+00');

-- Bảng: public.donhang (6 bản ghi)
INSERT INTO public.donhang ("DonHangID", "MaDonHang", "KhachHangID", "NhanVienID", "BanID", "TongTien", "GiamGia", "ThanhTien", "DiemCongThem", "DiemSuDung", "PhuongThucThanhToan", "TrangThai", "GhiChu", "VoucherID", "LoaiDonHangID", "NgayTao", "NgayCapNhat") VALUES (34, 'DH028059', 18, NULL, NULL, 80000.00, 0.00, 80000.00, 0, 0, 'TienMat', 'HoanThanh', 'Đặt tại quầy', NULL, 2, '2026-07-15 01:47:09.974583+00', '2026-07-15 01:49:28.139353+00');
INSERT INTO public.donhang ("DonHangID", "MaDonHang", "KhachHangID", "NhanVienID", "BanID", "TongTien", "GiamGia", "ThanhTien", "DiemCongThem", "DiemSuDung", "PhuongThucThanhToan", "TrangThai", "GhiChu", "VoucherID", "LoaiDonHangID", "NgayTao", "NgayCapNhat") VALUES (35, 'DH075194', 18, NULL, NULL, 25000.00, 0.00, 25000.00, 0, 0, 'TienMat', 'HoanThanh', 'Đặt tại quầy', NULL, 2, '2026-07-15 01:47:56.741703+00', '2026-07-15 01:49:34.525965+00');
INSERT INTO public.donhang ("DonHangID", "MaDonHang", "KhachHangID", "NhanVienID", "BanID", "TongTien", "GiamGia", "ThanhTien", "DiemCongThem", "DiemSuDung", "PhuongThucThanhToan", "TrangThai", "GhiChu", "VoucherID", "LoaiDonHangID", "NgayTao", "NgayCapNhat") VALUES (36, 'DH163483', 27, NULL, NULL, 25000.00, 0.00, 25000.00, 0, 0, 'TienMat', 'DangPhaChe', 'Đặt tại quầy', NULL, 1, '2026-08-11 01:02:45.80548+00', '2026-08-11 01:03:06.669321+00');
INSERT INTO public.donhang ("DonHangID", "MaDonHang", "KhachHangID", "NhanVienID", "BanID", "TongTien", "GiamGia", "ThanhTien", "DiemCongThem", "DiemSuDung", "PhuongThucThanhToan", "TrangThai", "GhiChu", "VoucherID", "LoaiDonHangID", "NgayTao", "NgayCapNhat") VALUES (32, 'DH791953', 18, NULL, NULL, 40000.00, 0.00, 40000.00, 0, 0, 'ChuyenKhoan', 'HoanThanh', 'SĐT: 0397409029. Địa chỉ: 127 Lý Thường Kiệt', NULL, 3, '2026-07-15 01:09:53.755649+00', '2026-07-15 01:10:27.701867+00');
INSERT INTO public.donhang ("DonHangID", "MaDonHang", "KhachHangID", "NhanVienID", "BanID", "TongTien", "GiamGia", "ThanhTien", "DiemCongThem", "DiemSuDung", "PhuongThucThanhToan", "TrangThai", "GhiChu", "VoucherID", "LoaiDonHangID", "NgayTao", "NgayCapNhat") VALUES (33, 'DH940492', 18, NULL, NULL, 60000.00, 0.00, 60000.00, 0, 0, 'ChuyenKhoan', 'HoanThanh', 'SĐT: 0397409029. Địa chỉ: 239 Châu Thị Vĩnh Tế', NULL, 3, '2026-07-15 01:12:22.115267+00', '2026-07-15 01:16:14.783831+00');
INSERT INTO public.donhang ("DonHangID", "MaDonHang", "KhachHangID", "NhanVienID", "BanID", "TongTien", "GiamGia", "ThanhTien", "DiemCongThem", "DiemSuDung", "PhuongThucThanhToan", "TrangThai", "GhiChu", "VoucherID", "LoaiDonHangID", "NgayTao", "NgayCapNhat") VALUES (31, 'DH487295', 18, NULL, NULL, 25000.00, 0.00, 25000.00, 0, 0, 'ChuyenKhoan', 'DaHuy', 'SĐT: 0397409029. Địa chỉ: 254 Nguyễn Văn Linh', NULL, 3, '2026-07-15 01:04:48.93289+00', '2026-07-15 01:16:48.200744+00');

-- Bảng: public.hangthanhvien (3 bản ghi)
INSERT INTO public.hangthanhvien ("HangThanhVienID", "TenHang", "DiemToiThieu", "PhanTramGiam") VALUES (1, 'Silver', 0, 0.00);
INSERT INTO public.hangthanhvien ("HangThanhVienID", "TenHang", "DiemToiThieu", "PhanTramGiam") VALUES (2, 'Gold', 1000, 5.00);
INSERT INTO public.hangthanhvien ("HangThanhVienID", "TenHang", "DiemToiThieu", "PhanTramGiam") VALUES (3, 'Diamond', 5000, 10.00);

-- Bảng: public.hr_settings (1 bản ghi)
INSERT INTO public.hr_settings (key, value) VALUES ('schedule_locked', 'false');

-- Bảng: public.hr_staff_types (8 bản ghi)
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (19, 'Part-time');
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (20, 'Part-time');
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (1784078684118, 'Part-time');
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (1784078730346, 'Part-time');
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (1784078760017, 'Part-time');
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (1784078887565, 'Part-time');
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (1784079487140, 'Part-time');
INSERT INTO public.hr_staff_types (user_id, staff_type) VALUES (26, 'Full-time');

-- Bảng: public.loaidonhang (3 bản ghi)
INSERT INTO public.loaidonhang ("LoaiDonHangID", "TenLoaiDonHang") VALUES (1, 'TaiQuan');
INSERT INTO public.loaidonhang ("LoaiDonHangID", "TenLoaiDonHang") VALUES (2, 'MangDi');
INSERT INTO public.loaidonhang ("LoaiDonHangID", "TenLoaiDonHang") VALUES (3, 'DatOnline');

-- Bảng: public.nguoidung (8 bản ghi)
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (2, 1, 'Quản Trị Viên', 'admin', 'admin@coffee.com', '0909090909', 'admin123', NULL, NULL, NULL, NULL, 'HoatDong', 0, 1, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-01 02:28:18.138368+00');
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (3, 2, 'Lê Thị Quản Lý', 'manager', 'manager@coffee.com', '0911111111', '123456', NULL, NULL, NULL, NULL, 'HoatDong', 0, 1, TRUE, '2026-07-01 02:28:18.138368+00', '2026-07-15 00:53:51.152361+00');
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (18, 6, 'Trần Vĩnh An', 'AnHihi', 'tranvinhan1106@gmail.com', '0397409029', '030204', NULL, 'Nam', '2004-11-06', '', 'HoatDong', 60, 1, FALSE, '2026-07-15 01:00:44.560712+00', '2026-07-15 01:16:14.950659+00');
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (20, 4, 'Trần Vĩnh An', 'tranvinhan123', 'tranvinhan123@coffee.vn', '09783488344444', 'admin123', NULL, NULL, NULL, NULL, 'HoatDong', 0, 1, TRUE, '2026-07-15 01:24:07.25815+00', '2026-07-15 01:24:20.79218+00');
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (26, 5, 'Võ Nguyễn Đình Quốc Huy', 'Huy Võ', 'Huy Võ@coffee.vn', '0985123321', '123321', NULL, NULL, NULL, NULL, 'HoatDong', 0, 1, TRUE, '2026-07-15 03:09:22.892595+00', '2026-07-25 11:08:56.000108+00');
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (19, 4, 'Nguyễn Văn Mạnh', 'nguyenvanmanh11', 'nguyenvanmanh11@coffee.vn', '0793503369', '123456', NULL, NULL, NULL, NULL, 'HoatDong', 0, 1, TRUE, '2026-07-15 01:23:17.228891+00', '2026-07-25 11:09:01.479457+00');
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (27, 6, 'An', 'An', NULL, '123123132', '11062004''', NULL, NULL, NULL, NULL, 'HoatDong', 0, 1, FALSE, '2026-08-11 01:02:05.785095+00', '2026-08-11 01:02:05.785095+00');
INSERT INTO public.nguoidung ("NguoiDungID", "VaiTroID", "HoTen", "TenDangNhap", "Email", "SoDienThoai", "MatKhau", "AnhDaiDien", "GioiTinh", "NgaySinh", "DiaChi", "TrangThai", "TongDiem", "HangThanhVienID", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (28, 6, 'Nguyễn Quốc Nam Việt', 'namviet', NULL, '0946115214', '1', NULL, NULL, NULL, NULL, 'HoatDong', 0, 1, FALSE, '2026-11-10 03:27:10.698634+00', '2026-11-10 03:27:10.698634+00');

-- Bảng: public.nguyenlieu (13 bản ghi)
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (5, 'Trà túi lọc', 'Gói', 200.00, 50.00, 2000.00, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (4, 'Đào ngâm', 'Hộp', 24.00, 5.00, 65000.00, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (3, 'Sữa đặc', 'Hộp', 40.10, 5.00, 22000.00, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (1, 'Cà phê hạt xay', 'Kg', 21.00, 5.00, 250000.00, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (2, 'Sữa tươi thanh trùng', 'Lít', 19.20, 10.00, 35000.00, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (6, 'Nước cốt dừa', 'kg', 10.00, 2.00, NULL, '2026-07-15 03:15:45.048532+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (7, 'Bơ', 'kg', 10.00, 2.00, NULL, '2026-07-15 03:20:34.991781+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (9, 'Nước sôi', 'lít', 10.00, 2.00, NULL, '2026-07-15 03:23:18.721033+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (10, 'Bột cacao', 'kg', 10.00, 2.00, NULL, '2026-07-15 03:24:00.783172+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (11, 'ớt tươi', 'kg', 10.00, 2.00, NULL, '2026-07-15 03:32:56.317049+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (12, 'lá khế', 'g', 10.00, 2.00, NULL, '2026-07-15 03:33:16.15756+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (13, 'Soda', 'lít', 10.00, 2.00, NULL, '2026-07-15 03:34:47.652942+00');
INSERT INTO public.nguyenlieu ("NguyenLieuID", "TenNguyenLieu", "DonViTinh", "SoLuongTon", "SoLuongToiThieu", "GiaNhap", "NgayTao") VALUES (14, 'Siro việt quất', 'lít', 10.00, 2.00, NULL, '2026-07-15 03:35:07.815119+00');

-- Bảng: public.phieunhapkho (3 bản ghi)
INSERT INTO public.phieunhapkho ("PhieuNhapID", "NgayTao", "GhiChu") VALUES ('286be62f-4f6b-4e4a-9015-7407b58e0e93', '2026-07-10 07:28:56.860735+00', 'Nhập tay từ quản lý kho');
INSERT INTO public.phieunhapkho ("PhieuNhapID", "NgayTao", "GhiChu") VALUES ('eda6353f-4ede-4d55-90a6-8cb82e4584e6', '2026-07-10 07:59:38.155479+00', 'Nhập tay từ quản lý kho');
INSERT INTO public.phieunhapkho ("PhieuNhapID", "NgayTao", "GhiChu") VALUES ('5af22bde-e6a4-4305-a979-780589cc2aa0', '2026-07-15 00:57:41.203194+00', 'Nhập tay từ quản lý kho');

-- Bảng: public.phieuxuatkho (4 bản ghi)
INSERT INTO public.phieuxuatkho ("PhieuXuatID", "NgayTao", "GhiChu", "DonHangID") VALUES ('b73ce215-1d12-4fb0-93b1-26976daaaadf', '2026-07-10 07:57:15.751258+00', 'Xuất tự động từ pha chế', 29);
INSERT INTO public.phieuxuatkho ("PhieuXuatID", "NgayTao", "GhiChu", "DonHangID") VALUES ('e30a398b-b3a7-41f6-bd79-2a6db48296ba', '2026-07-15 00:45:01.427892+00', 'Xuất tự động từ pha chế', 30);
INSERT INTO public.phieuxuatkho ("PhieuXuatID", "NgayTao", "GhiChu", "DonHangID") VALUES ('2bcf4e7a-945b-4431-8528-2ddf206487f9', '2026-07-15 01:49:29.086572+00', 'Xuất tự động từ pha chế', 34);
INSERT INTO public.phieuxuatkho ("PhieuXuatID", "NgayTao", "GhiChu", "DonHangID") VALUES ('45ea1813-c3c9-4f70-9ef2-889dae5731ff', '2026-07-15 01:49:35.438349+00', 'Xuất tự động từ pha chế', 35);

-- Bảng: public.sanpham (19 bản ghi)
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (12, 2, 'Trà đào ', 'Hương vị ngon toẹt', 'fa-mug-hot', TRUE, FALSE, TRUE, '2026-07-01 03:59:52.162961+00', '2026-07-02 10:41:10.782148+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (13, 1, 'AnTest', 'New', 'fa-mug-hot', TRUE, FALSE, TRUE, '2026-07-03 16:46:48.635689+00', '2026-07-03 16:47:50.788717+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (8, 2, 'Trà đào ', 'Hương vị ngon toẹt', 'fa-mug-hot', TRUE, FALSE, TRUE, '2026-07-01 03:59:50.588824+00', '2026-07-04 14:55:08.104604+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (9, 2, 'Trà đào ', 'Hương vị ngon toẹt', 'fa-mug-hot', TRUE, FALSE, TRUE, '2026-07-01 03:59:50.598681+00', '2026-07-04 14:55:14.378147+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (10, 2, 'Trà đào ', 'Hương vị ngon toẹt', 'fa-mug-hot', TRUE, FALSE, TRUE, '2026-07-01 03:59:50.693264+00', '2026-07-04 14:55:20.21407+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (11, 2, 'Trà đào ', 'Hương vị ngon toẹt', 'fa-mug-hot', TRUE, FALSE, TRUE, '2026-07-01 03:59:51.989915+00', '2026-07-04 14:55:25.47802+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (14, 2, 'Trà đào (new)', '', 'https://hunufa.vn/wp-content/uploads/2025/08/hinh-anh-ly-tra-dao-dep-27.webp', TRUE, FALSE, FALSE, '2026-07-10 11:02:48.198412+00', '2026-07-10 11:03:37.709241+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (1, 1, 'CÀ PHÊ ĐEN TRUYỀN THỐNG', 'Hương vị nguyên bản.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTkm6eh6NOUci3oMcEzrw8d6sOXKgDh4nVXAqb9wmVPQ&s=10', TRUE, FALSE, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-10 11:04:45.102612+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (6, 2, 'TRÀ VẢI THIỀU TỨ XUYÊN', 'Vị ngọt thanh dịu nhẹ.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQRXnhz-BGKkuP9Yl4S1xBnZcpcoKLjxo5hZIuDuwcbw&s=10', TRUE, FALSE, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-10 11:06:23.321559+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (3, 2, 'TRÀ ĐÀO CAM SẢ', 'Thanh mát giải nhiệt.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4av7RgIxgsEOqssuhlAU7Xj-SLKA-d-NTmi_vC9lgBA&s=10', TRUE, FALSE, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-10 11:07:06.093792+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (7, 3, 'TIRAMISU', 'Béo ngậy hương cà phê.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLQ93Nu1Vb_d-uc0cKjr_PCj72l_wkOzkanyEVDDIRMw&s=10', TRUE, FALSE, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-10 11:07:34.656289+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (2, 1, 'BẠC XỈU ĐÁ', 'Sự kết hợp hoàn hảo.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyWcNmFpase_d8SfGg_J9ZO5uGJtw9sqF90NhaD-Yywg&s=10', TRUE, FALSE, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-10 11:08:14.811069+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (4, 3, 'BÁNH CROISSANT', 'Bánh sừng bò nướng bơ.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOmB0zkK4xDa47dZoBfuvYQbRV1LFm8RLQMFO18ylETw&s=10', TRUE, FALSE, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-10 11:08:47.195962+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (5, 1, 'ESPRESSO Ý', 'Đậm đà, bừng tỉnh.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREJbaxHms-6jAkTXNW3iL2H63s-hjPi3sT7RfI6KRyjA&s=10', TRUE, FALSE, FALSE, '2026-07-01 02:28:18.138368+00', '2026-07-10 11:09:19.412505+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (15, 2, 'Bơ già dừa non', '', 'https://media.kinhtetieudung.vn/images/2026/03/18/33-1773798967-528871219-1148931657256092-9018023693759675752-n-db22.jpg', TRUE, FALSE, FALSE, '2026-07-15 03:19:01.182281+00', '2026-07-15 03:19:01.182281+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (16, 1, 'Cacao', '', 'https://tse2.mm.bing.net/th/id/OIP.KBOAx0BPIiOKjt-8HMcNIQHaFP?r=0&rs=1&pid=ImgDetMain&o=7&rm=3', TRUE, FALSE, FALSE, '2026-07-15 03:22:33.631401+00', '2026-07-15 03:22:33.631401+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (17, 1, 'Trà sữa truyền thống', '', 'https://th.bing.com/th/id/R.476fb94dcfc5f4d74c3af09922f3ff0f?rik=jd8GaJiLR5gLWg&pid=ImgRaw&r=0', TRUE, FALSE, FALSE, '2026-07-15 03:25:50.260301+00', '2026-07-15 03:25:50.260301+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (18, 2, 'Nước cốt ớt mix lá khế', 'cảm nhận đươc đắng cay cuộc đời', 'https://www.adcfoods.com/wp-content/uploads/2021/10/cach-lam-nuoc-sot-tokbokki-han-quoc.jpg', TRUE, FALSE, FALSE, '2026-07-15 03:32:39.503912+00', '2026-07-15 03:32:39.503912+00');
INSERT INTO public.sanpham ("SanPhamID", "DanhMucID", "TenSanPham", "MoTa", "HinhAnh", "ConBan", "NoiBat", "DaXoa", "NgayTao", "NgayCapNhat") VALUES (19, 2, 'Soda việt quất', '', 'https://befresh.vn/wp-content/uploads/2023/04/mojito-viet-quat.jpg', TRUE, FALSE, FALSE, '2026-07-15 03:34:29.902663+00', '2026-07-15 03:34:29.902663+00');

-- Bảng: public.sanphamsize (17 bản ghi)
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (2, 1, 'M', 30000.00, 150);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (3, 1, 'L', 35000.00, 200);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (5, 2, 'M', 35000.00, 300);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (6, 2, 'L', 40000.00, 350);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (8, 3, 'M', 45000.00, 220);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (9, 3, 'L', 50000.00, 260);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (12, 5, 'M', 40000.00, 10);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (13, 5, 'L', 45000.00, 15);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (15, 6, 'M', 50000.00, 230);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (16, 6, 'L', 55000.00, 280);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (1, 1, 'S', 25000.00, 100);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (14, 6, 'S', 45000.00, 190);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (7, 3, 'S', 40000.00, 180);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (17, 7, 'S', 45000.00, 420);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (4, 2, 'S', 30000.00, 250);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (10, 4, 'S', 35000.00, 350);
INSERT INTO public.sanphamsize ("SanPhamSizeID", "SanPhamID", "KichThuoc", "Gia", "Calories") VALUES (11, 5, 'S', 35000.00, 5);

-- Bảng: public.sanphamtopping (9 bản ghi)
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (1, 1);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (1, 2);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (2, 1);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (2, 2);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (3, 1);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (3, 2);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (5, 2);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (6, 1);
INSERT INTO public.sanphamtopping ("SanPhamID", "ToppingID") VALUES (6, 2);

-- Bảng: public.topping (2 bản ghi)
INSERT INTO public.topping ("ToppingID", "TenTopping", "Gia", "DaXoa", "NgayTao") VALUES (1, 'Trân châu đen', 5000.00, FALSE, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.topping ("ToppingID", "TenTopping", "Gia", "DaXoa", "NgayTao") VALUES (2, 'Kem Macchiato', 10000.00, FALSE, '2026-07-01 02:28:18.138368+00');

-- Bảng: public.vaitro (6 bản ghi)
INSERT INTO public.vaitro ("VaiTroID", "TenVaiTro", "MoTa") VALUES (1, 'Admin', 'Quan tri he thong');
INSERT INTO public.vaitro ("VaiTroID", "TenVaiTro", "MoTa") VALUES (2, 'Manager', 'Quan ly quan');
INSERT INTO public.vaitro ("VaiTroID", "TenVaiTro", "MoTa") VALUES (3, 'Cashier', 'Thu ngan');
INSERT INTO public.vaitro ("VaiTroID", "TenVaiTro", "MoTa") VALUES (4, 'Barista', 'Nhan vien pha che');
INSERT INTO public.vaitro ("VaiTroID", "TenVaiTro", "MoTa") VALUES (5, 'Staff', 'Nhan vien phuc vu');
INSERT INTO public.vaitro ("VaiTroID", "TenVaiTro", "MoTa") VALUES (6, 'Customer', 'Khach hang');

-- Bảng: public.voucher (3 bản ghi)
INSERT INTO public.voucher ("VoucherID", "MaVoucher", "TenVoucher", "LoaiGiamGia", "GiaTriGiam", "GiaTriGiamToiDa", "DonHangToiThieu", "SoLuong", "SoLanDungToiDa", "NgayBatDau", "NgayKetThuc", "TrangThai", "DaXoa", "NgayTao") VALUES (1, 'GIAM10K', 'Giảm trực tiếp 10K', 'TienMat', 10000.00, 10000.00, 20000.00, 100, 1, NULL, NULL, 'HoatDong', FALSE, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.voucher ("VoucherID", "MaVoucher", "TenVoucher", "LoaiGiamGia", "GiaTriGiam", "GiaTriGiamToiDa", "DonHangToiThieu", "SoLuong", "SoLanDungToiDa", "NgayBatDau", "NgayKetThuc", "TrangThai", "DaXoa", "NgayTao") VALUES (2, 'GIAM10PT', 'Giảm 10% Tối Đa 30k', 'PhanTram', 10.00, 30000.00, 50000.00, 50, 1, NULL, NULL, 'HoatDong', FALSE, '2026-07-01 02:28:18.138368+00');
INSERT INTO public.voucher ("VoucherID", "MaVoucher", "TenVoucher", "LoaiGiamGia", "GiaTriGiam", "GiaTriGiamToiDa", "DonHangToiThieu", "SoLuong", "SoLanDungToiDa", "NgayBatDau", "NgayKetThuc", "TrangThai", "DaXoa", "NgayTao") VALUES (3, 'Vietuser', 'Giảm 100%', 'PhanTram', 100.00, 30170.00, 50000.00, 100, 1, NULL, NULL, 'HoatDong', FALSE, '2026-07-03 16:54:36.374945+00');

-- ==============================================================================
-- 9. ĐỒNG BỘ GIÁ TRỊ TỰ TĂNG (SETVAL)
-- ==============================================================================
SELECT pg_catalog.setval('public."ban_BanID_seq"', 11, true);
SELECT pg_catalog.setval('public."calamviec_CaLamViecID_seq"', 1, false);
SELECT pg_catalog.setval('public."chitietdonhang_ChiTietDonHangID_seq"', 40, true);
SELECT pg_catalog.setval('public."congthucphache_CongThucID_seq"', 23, true);
SELECT pg_catalog.setval('public."danhgia_DanhGiaID_seq"', 4, true);
SELECT pg_catalog.setval('public."danhmuc_DanhMucID_seq"', 1, false);
SELECT pg_catalog.setval('public."datban_DatBanID_seq"', 16, true);
SELECT pg_catalog.setval('public."donhang_DonHangID_seq"', 36, true);
SELECT pg_catalog.setval('public."hangthanhvien_HangThanhVienID_seq"', 1, false);
SELECT pg_catalog.setval('public."lichsuhanhvi_LichSuHanhViID_seq"', 1, false);
SELECT pg_catalog.setval('public."lichsukho_LichSuKhoID_seq"', 1, false);
SELECT pg_catalog.setval('public."loaidonhang_LoaiDonHangID_seq"', 1, false);
SELECT pg_catalog.setval('public."nguoidung_NguoiDungID_seq"', 28, true);
SELECT pg_catalog.setval('public."nguyenlieu_NguyenLieuID_seq"', 14, true);
SELECT pg_catalog.setval('public."nhatkyhoatdong_NhatKyID_seq"', 1, false);
SELECT pg_catalog.setval('public."phancongcalam_PhanCongID_seq"', 1, false);
SELECT pg_catalog.setval('public."sanpham_SanPhamID_seq"', 19, true);
SELECT pg_catalog.setval('public."sanphamsize_SanPhamSizeID_seq"', 15, true);
SELECT pg_catalog.setval('public."thanhtoan_ThanhToanID_seq"', 1, false);
SELECT pg_catalog.setval('public."thongbao_ThongBaoID_seq"', 1, false);
SELECT pg_catalog.setval('public."topping_ToppingID_seq"', 1, false);
SELECT pg_catalog.setval('public."vaitro_VaiTroID_seq"', 1, false);
SELECT pg_catalog.setval('public."voucher_VoucherID_seq"', 3, true);

-- ==============================================================================
-- 10. RÀNG BUỘC DUY NHẤT & CHỈ MỤC (UNIQUE CONSTRAINTS & INDEXES)
-- ==============================================================================
ALTER TABLE ONLY public.donhang ADD CONSTRAINT "donhang_MaDonHang_key" UNIQUE ("MaDonHang");
ALTER TABLE ONLY public.hangthanhvien ADD CONSTRAINT "hangthanhvien_TenHang_key" UNIQUE ("TenHang");
ALTER TABLE ONLY public.hr_shifts ADD CONSTRAINT hr_shifts_day_of_week_shift_id_user_id_key UNIQUE (day_of_week, shift_id, user_id);
ALTER TABLE ONLY public.loaidonhang ADD CONSTRAINT "loaidonhang_TenLoaiDonHang_key" UNIQUE ("TenLoaiDonHang");
ALTER TABLE ONLY public.nguoidung ADD CONSTRAINT "nguoidung_Email_key" UNIQUE ("Email");
ALTER TABLE ONLY public.nguoidung ADD CONSTRAINT "nguoidung_SoDienThoai_key" UNIQUE ("SoDienThoai");
ALTER TABLE ONLY public.nguoidung ADD CONSTRAINT "nguoidung_TenDangNhap_key" UNIQUE ("TenDangNhap");
ALTER TABLE ONLY public.thanhtoan ADD CONSTRAINT "thanhtoan_MaThanhToan_key" UNIQUE ("MaThanhToan");
ALTER TABLE ONLY public.danhgia ADD CONSTRAINT uq_danhgia UNIQUE ("KhachHangID", "DonHangID", "SanPhamID");
ALTER TABLE ONLY public.vaitro ADD CONSTRAINT "vaitro_TenVaiTro_key" UNIQUE ("TenVaiTro");
ALTER TABLE ONLY public.voucher ADD CONSTRAINT "voucher_MaVoucher_key" UNIQUE ("MaVoucher");
CREATE INDEX IF NOT EXISTS idx_nguoidung_vaitro_daxoa ON public.nguoidung USING btree ("VaiTroID", "DaXoa") WHERE ("DaXoa" = false);

-- ==============================================================================
-- 11. KHÓA NGOẠI (FOREIGN KEYS)
-- ==============================================================================
ALTER TABLE ONLY public.chitietdonhang ADD CONSTRAINT "chitietdonhang_DonHangID_fkey" FOREIGN KEY ("DonHangID") REFERENCES public.donhang("DonHangID") ON DELETE CASCADE;
ALTER TABLE ONLY public.chitietdonhang ADD CONSTRAINT "chitietdonhang_SanPhamSizeID_fkey" FOREIGN KEY ("SanPhamSizeID") REFERENCES public.sanphamsize("SanPhamSizeID");
ALTER TABLE ONLY public.chitietnhapkho ADD CONSTRAINT "chitietnhapkho_NguyenLieuID_fkey" FOREIGN KEY ("NguyenLieuID") REFERENCES public.nguyenlieu("NguyenLieuID") ON DELETE CASCADE;
ALTER TABLE ONLY public.chitietnhapkho ADD CONSTRAINT "chitietnhapkho_PhieuNhapID_fkey" FOREIGN KEY ("PhieuNhapID") REFERENCES public.phieunhapkho("PhieuNhapID") ON DELETE CASCADE;
ALTER TABLE ONLY public.chitiettopping ADD CONSTRAINT "chitiettopping_ChiTietDonHangID_fkey" FOREIGN KEY ("ChiTietDonHangID") REFERENCES public.chitietdonhang("ChiTietDonHangID") ON DELETE CASCADE;
ALTER TABLE ONLY public.chitiettopping ADD CONSTRAINT "chitiettopping_ToppingID_fkey" FOREIGN KEY ("ToppingID") REFERENCES public.topping("ToppingID") ON DELETE CASCADE;
ALTER TABLE ONLY public.chitietxuatkho ADD CONSTRAINT "chitietxuatkho_NguyenLieuID_fkey" FOREIGN KEY ("NguyenLieuID") REFERENCES public.nguyenlieu("NguyenLieuID") ON DELETE CASCADE;
ALTER TABLE ONLY public.chitietxuatkho ADD CONSTRAINT "chitietxuatkho_PhieuXuatID_fkey" FOREIGN KEY ("PhieuXuatID") REFERENCES public.phieuxuatkho("PhieuXuatID") ON DELETE CASCADE;
ALTER TABLE ONLY public.congthucphache ADD CONSTRAINT "congthucphache_NguyenLieuID_fkey" FOREIGN KEY ("NguyenLieuID") REFERENCES public.nguyenlieu("NguyenLieuID");
ALTER TABLE ONLY public.congthucphache ADD CONSTRAINT "congthucphache_SanPhamID_fkey" FOREIGN KEY ("SanPhamID") REFERENCES public.sanpham("SanPhamID");
ALTER TABLE ONLY public.danhgia ADD CONSTRAINT "danhgia_DonHangID_fkey" FOREIGN KEY ("DonHangID") REFERENCES public.donhang("DonHangID");
ALTER TABLE ONLY public.danhgia ADD CONSTRAINT "danhgia_KhachHangID_fkey" FOREIGN KEY ("KhachHangID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.danhgia ADD CONSTRAINT "danhgia_SanPhamID_fkey" FOREIGN KEY ("SanPhamID") REFERENCES public.sanpham("SanPhamID");
ALTER TABLE ONLY public.datban ADD CONSTRAINT "datban_BanID_fkey" FOREIGN KEY ("BanID") REFERENCES public.ban("BanID");
ALTER TABLE ONLY public.datban ADD CONSTRAINT "datban_KhachHangID_fkey" FOREIGN KEY ("KhachHangID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.donhang ADD CONSTRAINT "donhang_BanID_fkey" FOREIGN KEY ("BanID") REFERENCES public.ban("BanID");
ALTER TABLE ONLY public.donhang ADD CONSTRAINT "donhang_KhachHangID_fkey" FOREIGN KEY ("KhachHangID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.donhang ADD CONSTRAINT "donhang_LoaiDonHangID_fkey" FOREIGN KEY ("LoaiDonHangID") REFERENCES public.loaidonhang("LoaiDonHangID");
ALTER TABLE ONLY public.donhang ADD CONSTRAINT "donhang_NhanVienID_fkey" FOREIGN KEY ("NhanVienID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.donhang ADD CONSTRAINT "donhang_VoucherID_fkey" FOREIGN KEY ("VoucherID") REFERENCES public.voucher("VoucherID");
ALTER TABLE ONLY public.lichsuhanhvi ADD CONSTRAINT "lichsuhanhvi_KhachHangID_fkey" FOREIGN KEY ("KhachHangID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.lichsuhanhvi ADD CONSTRAINT "lichsuhanhvi_SanPhamID_fkey" FOREIGN KEY ("SanPhamID") REFERENCES public.sanpham("SanPhamID");
ALTER TABLE ONLY public.lichsukho ADD CONSTRAINT "lichsukho_NguoiTaoID_fkey" FOREIGN KEY ("NguoiTaoID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.lichsukho ADD CONSTRAINT "lichsukho_NguyenLieuID_fkey" FOREIGN KEY ("NguyenLieuID") REFERENCES public.nguyenlieu("NguyenLieuID");
ALTER TABLE ONLY public.nguoidung ADD CONSTRAINT "nguoidung_HangThanhVienID_fkey" FOREIGN KEY ("HangThanhVienID") REFERENCES public.hangthanhvien("HangThanhVienID");
ALTER TABLE ONLY public.nguoidung ADD CONSTRAINT "nguoidung_VaiTroID_fkey" FOREIGN KEY ("VaiTroID") REFERENCES public.vaitro("VaiTroID");
ALTER TABLE ONLY public.nhatkyhoatdong ADD CONSTRAINT "nhatkyhoatdong_NguoiDungID_fkey" FOREIGN KEY ("NguoiDungID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.phancongcalam ADD CONSTRAINT "phancongcalam_CaLamViecID_fkey" FOREIGN KEY ("CaLamViecID") REFERENCES public.calamviec("CaLamViecID");
ALTER TABLE ONLY public.phancongcalam ADD CONSTRAINT "phancongcalam_NhanVienID_fkey" FOREIGN KEY ("NhanVienID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.sanpham ADD CONSTRAINT "sanpham_DanhMucID_fkey" FOREIGN KEY ("DanhMucID") REFERENCES public.danhmuc("DanhMucID");
ALTER TABLE ONLY public.sanphamsize ADD CONSTRAINT "sanphamsize_SanPhamID_fkey" FOREIGN KEY ("SanPhamID") REFERENCES public.sanpham("SanPhamID") ON DELETE CASCADE;
ALTER TABLE ONLY public.sanphamtopping ADD CONSTRAINT "sanphamtopping_SanPhamID_fkey" FOREIGN KEY ("SanPhamID") REFERENCES public.sanpham("SanPhamID") ON DELETE CASCADE;
ALTER TABLE ONLY public.sanphamtopping ADD CONSTRAINT "sanphamtopping_ToppingID_fkey" FOREIGN KEY ("ToppingID") REFERENCES public.topping("ToppingID") ON DELETE CASCADE;
ALTER TABLE ONLY public.thanhtoan ADD CONSTRAINT "thanhtoan_DonHangID_fkey" FOREIGN KEY ("DonHangID") REFERENCES public.donhang("DonHangID") ON DELETE CASCADE;
ALTER TABLE ONLY public.thongbao ADD CONSTRAINT "thongbao_NguoiDungID_fkey" FOREIGN KEY ("NguoiDungID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.voucherkhachhang ADD CONSTRAINT "voucherkhachhang_KhachHangID_fkey" FOREIGN KEY ("KhachHangID") REFERENCES public.nguoidung("NguoiDungID");
ALTER TABLE ONLY public.voucherkhachhang ADD CONSTRAINT "voucherkhachhang_VoucherID_fkey" FOREIGN KEY ("VoucherID") REFERENCES public.voucher("VoucherID");

-- ==============================================================================
-- 12. TRIGGERS TỰ ĐỘNG CẬP NHẬT THỜI GIAN SỬA ĐỔI
-- ==============================================================================
DROP TRIGGER IF EXISTS update_donhang_modtime ON public.donhang;
CREATE TRIGGER update_donhang_modtime BEFORE UPDATE ON public.donhang FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_nguoidung_modtime ON public.nguoidung;
CREATE TRIGGER update_nguoidung_modtime BEFORE UPDATE ON public.nguoidung FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_sanpham_modtime ON public.sanpham;
CREATE TRIGGER update_sanpham_modtime BEFORE UPDATE ON public.sanpham FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- ==============================================================================
-- 13. BẢO MẬT & PHÂN QUYỀN ROW LEVEL SECURITY (RLS CHO TẤT CẢ CÁC BẢNG)
-- Đảm bảo Web không bao giờ bị lỗi 0 rows do thiếu quyền đọc ghi
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'ban', 'calamviec', 'chitietdonhang', 'chitietnhapkho', 'chitiettopping',
        'chitietxuatkho', 'congthucphache', 'danhgia', 'danhmuc', 'datban',
        'donhang', 'hangthanhvien', 'hr_settings', 'hr_shifts', 'hr_staff_types',
        'hr_timeclock', 'lichsuhanhvi', 'lichsukho', 'loaidonhang', 'nguoidung',
        'nguyenlieu', 'nhatkyhoatdong', 'phancongcalam', 'phieunhapkho', 'phieuxuatkho',
        'sanpham', 'sanphamsize', 'sanphamtopping', 'thanhtoan', 'thongbao',
        'topping', 'vaitro', 'voucher', 'voucherkhachhang'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_All_Access_%I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow_All_Access_%I" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 14. THIẾT LẬP ĐỒNG BỘ THỜI GIAN THỰC (SUPABASE REALTIME PUBLICATION)
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY['ban', 'datban', 'donhang', 'hr_settings', 'hr_shifts', 'hr_staff_types', 'hr_timeclock', 'nguoidung', 'sanpham', 'vaitro'];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tbl IN ARRAY tbls LOOP
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.%I', tbl);
            EXCEPTION WHEN duplicate_object THEN
                NULL;
            END;
        END LOOP;
    END IF;
END $$;

-- ==============================================================================
-- 15. CẤP QUYỀN HỆ THỐNG (GRANTS CHO ANON, AUTHENTICATED, SERVICE_ROLE)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
