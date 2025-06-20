--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-06-20 05:53:21

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 17789)
-- Name: affiliate_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.affiliate_settings (
    id integer NOT NULL,
    referrer_bonus numeric(10,2) DEFAULT 1.00,
    referred_bonus numeric(10,2) DEFAULT 1.00,
    commission_percentage numeric(5,2) DEFAULT 5.00,
    min_withdrawal numeric(10,2) DEFAULT 10.00,
    is_active boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.affiliate_settings OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 17788)
-- Name: affiliate_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.affiliate_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.affiliate_settings_id_seq OWNER TO postgres;

--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 217
-- Name: affiliate_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.affiliate_settings_id_seq OWNED BY public.affiliate_settings.id;


--
-- TOC entry 219 (class 1259 OID 17801)
-- Name: game_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    game_type text NOT NULL,
    bet_amount numeric(10,2) NOT NULL,
    status text NOT NULL,
    result text,
    win_amount numeric(10,2) DEFAULT 0.00,
    matched_pairs integer DEFAULT 0,
    game_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


ALTER TABLE public.game_sessions OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17812)
-- Name: game_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_settings (
    id integer NOT NULL,
    max_time integer DEFAULT 30 NOT NULL,
    max_moves integer DEFAULT 20 NOT NULL,
    win_multiplier numeric(5,2) DEFAULT 2.00 NOT NULL,
    min_bet numeric(10,2) DEFAULT 1.00 NOT NULL,
    max_bet numeric(10,2) DEFAULT 1000.00 NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.game_settings OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 17811)
-- Name: game_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_settings_id_seq OWNER TO postgres;

--
-- TOC entry 5049 (class 0 OID 0)
-- Dependencies: 220
-- Name: game_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_settings_id_seq OWNED BY public.game_settings.id;


--
-- TOC entry 223 (class 1259 OID 17825)
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 17824)
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- TOC entry 5050 (class 0 OID 0)
-- Dependencies: 222
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- TOC entry 225 (class 1259 OID 17838)
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    is_active boolean DEFAULT true,
    settings jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17837)
-- Name: payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_methods_id_seq OWNER TO postgres;

--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 224
-- Name: payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;


--
-- TOC entry 227 (class 1259 OID 17849)
-- Name: payment_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_settings (
    id integer NOT NULL,
    provider text NOT NULL,
    is_test_mode boolean DEFAULT true,
    client_id text,
    client_secret text,
    secret_key text,
    is_active boolean DEFAULT true,
    min_deposit_amount numeric(10,2) DEFAULT 10.00,
    max_deposit_amount numeric(10,2) DEFAULT 50000.00,
    min_withdrawal_amount numeric(10,2) DEFAULT 10.00,
    max_withdrawal_amount numeric(10,2) DEFAULT 50000.00,
    withdrawal_fee_percentage numeric(5,2) DEFAULT 2.50,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_settings OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17848)
-- Name: payment_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_settings_id_seq OWNER TO postgres;

--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 226
-- Name: payment_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_settings_id_seq OWNED BY public.payment_settings.id;


--
-- TOC entry 229 (class 1259 OID 17866)
-- Name: referral_commissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_commissions (
    id integer NOT NULL,
    referrer_id integer NOT NULL,
    referred_id integer NOT NULL,
    game_session_id text,
    bet_amount numeric(10,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    commission_percentage numeric(5,2) DEFAULT 5.00,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    paid_at timestamp without time zone
);


ALTER TABLE public.referral_commissions OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17865)
-- Name: referral_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.referral_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referral_commissions_id_seq OWNER TO postgres;

--
-- TOC entry 5053 (class 0 OID 0)
-- Dependencies: 228
-- Name: referral_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.referral_commissions_id_seq OWNED BY public.referral_commissions.id;


--
-- TOC entry 231 (class 1259 OID 17878)
-- Name: site_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    site_name text DEFAULT 'Memory Casino'::text NOT NULL,
    favicon text,
    logo_light text,
    logo_dark text,
    primary_color text DEFAULT '#6366f1'::text,
    theme text DEFAULT 'light'::text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.site_settings OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17877)
-- Name: site_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.site_settings_id_seq OWNER TO postgres;

--
-- TOC entry 5054 (class 0 OID 0)
-- Dependencies: 230
-- Name: site_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;


--
-- TOC entry 233 (class 1259 OID 17891)
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    balance_before numeric(10,2) NOT NULL,
    balance_after numeric(10,2) NOT NULL,
    description text,
    payment_method text,
    game_session_id text,
    external_txn_id text,
    order_number text,
    status text DEFAULT 'pending'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 17890)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 5055 (class 0 OID 0)
-- Dependencies: 232
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- TOC entry 235 (class 1259 OID 17903)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    user_token text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    name text,
    phone text,
    cpf text,
    balance numeric(10,2) DEFAULT 0.00,
    bonus_balance numeric(10,2) DEFAULT 0.00,
    total_earnings numeric(10,2) DEFAULT 0.00,
    total_withdrawals numeric(10,2) DEFAULT 0.00,
    withdrawal_blocked boolean DEFAULT false,
    deposit_blocked boolean DEFAULT false,
    account_blocked boolean DEFAULT false,
    referral_code text,
    referred_by text,
    has_received_referral_bonus boolean DEFAULT false,
    active_session_id text,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 17902)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5056 (class 0 OID 0)
-- Dependencies: 234
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4786 (class 2604 OID 17792)
-- Name: affiliate_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_settings ALTER COLUMN id SET DEFAULT nextval('public.affiliate_settings_id_seq'::regclass);


--
-- TOC entry 4796 (class 2604 OID 17815)
-- Name: game_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_settings ALTER COLUMN id SET DEFAULT nextval('public.game_settings_id_seq'::regclass);


--
-- TOC entry 4803 (class 2604 OID 17828)
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- TOC entry 4806 (class 2604 OID 17841)
-- Name: payment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);


--
-- TOC entry 4809 (class 2604 OID 17852)
-- Name: payment_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_settings ALTER COLUMN id SET DEFAULT nextval('public.payment_settings_id_seq'::regclass);


--
-- TOC entry 4818 (class 2604 OID 17869)
-- Name: referral_commissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_commissions ALTER COLUMN id SET DEFAULT nextval('public.referral_commissions_id_seq'::regclass);


--
-- TOC entry 4822 (class 2604 OID 17881)
-- Name: site_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);


--
-- TOC entry 4827 (class 2604 OID 17894)
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- TOC entry 4831 (class 2604 OID 17906)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5025 (class 0 OID 17789)
-- Dependencies: 218
-- Data for Name: affiliate_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.affiliate_settings (id, referrer_bonus, referred_bonus, commission_percentage, min_withdrawal, is_active, updated_at) FROM stdin;
\.


--
-- TOC entry 5026 (class 0 OID 17801)
-- Dependencies: 219
-- Data for Name: game_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.game_sessions (id, user_id, game_type, bet_amount, status, result, win_amount, matched_pairs, game_data, created_at, completed_at) FROM stdin;
session_1750395327706_qppycoxum	12	memory	10.00	completed	lost	0.00	2	"{}"	2025-06-20 04:55:27.706	\N
session_1750395368753_bdx2ww7wn	12	memory	10.00	completed	lost	0.00	6	"{}"	2025-06-20 04:56:08.753	\N
session_1750395403546_m1ttnf0k9	12	memory	10.00	completed	lost	17.00	8	"{}"	2025-06-20 04:56:43.546	\N
session_1750395506847_uvxxz62cg	12	memory	10.00	completed	lost	0.00	5	"{}"	2025-06-20 04:58:26.847	\N
session_1750395552368_90iukk7yi	12	memory	10.00	completed	lost	0.00	6	"{}"	2025-06-20 04:59:12.368	\N
session_1750395588704_cf12zmlep	12	memory	10.00	completed	lost	0.00	3	"{}"	2025-06-20 04:59:48.704	\N
session_1750395622749_8qf688eyu	12	memory	20.00	completed	won	35.00	8	"{}"	2025-06-20 05:00:22.749	\N
session_1750395855041_1z1jiyu8b	12	memory	10.00	completed	lost	0.00	6	"{}"	2025-06-20 05:04:15.041	\N
session_1750396180176_m2vg0vjhc	12	memory	10.00	completed	lost	0.00	7	"{}"	2025-06-20 05:09:40.176	\N
session_1750396310997_xn3b0cjzd	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 05:11:50.997	\N
session_1750396363337_qeszjuo9g	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 05:12:43.337	\N
session_1750396469171_zdxmvsa28	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 05:14:29.171	\N
session_1750396526224_1fw5b7ltp	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 05:15:26.224	\N
session_1750398154323_7dv6z8j5u	12	memory	10.00	completed	lost	0.00	7	"{}"	2025-06-20 05:42:34.323	\N
session_1750398390160_v60q9lfqu	12	memory	10.00	completed	lost	0.00	5	"{}"	2025-06-20 05:46:30.16	\N
session_1750395286132_g7fpz6nrv	12	memory	2.00	completed	lost	0.00	1	"{}"	2025-06-20 04:54:46.132	\N
session_1750398458289_6iyned960	12	memory	50.00	completed	lost	0.00	6	"{}"	2025-06-20 05:47:38.289	\N
session_1750398512192_oixmyzmb8	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 05:48:32.192	\N
session_1750399050626_q9i4tw0xb	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 05:57:30.626	\N
session_1750399162290_hsosbf03k	12	memory	10.00	completed	lost	0.00	6	"{}"	2025-06-20 05:59:22.29	\N
session_1750399211304_poq6zniqz	12	memory	10.00	completed	won	17.00	8	"{}"	2025-06-20 06:00:11.304	\N
session_1750400537131_629vrvmif	12	memory	10.00	completed	lost	0.00	7	"{}"	2025-06-20 06:22:17.131	\N
session_1750400591481_y4fg9gc8o	12	memory	20.00	completed	lost	0.00	4	"{}"	2025-06-20 06:23:11.481	\N
session_1750400655362_xlsmmv9a1	12	memory	50.00	completed	lost	0.00	5	"{}"	2025-06-20 06:24:15.362	\N
session_1750400690947_5ox36d6b9	12	memory	2.00	completed	lost	0.00	3	"{}"	2025-06-20 06:24:50.947	\N
session_1750400732290_abvvphsy0	12	memory	2.00	completed	lost	0.00	3	"{}"	2025-06-20 06:25:32.29	\N
session_1750400767873_9y1xt3uev	12	memory	20.00	completed	lost	0.00	4	"{}"	2025-06-20 06:26:07.873	\N
session_1750400802433_yk4okpzsb	12	memory	2.00	completed	lost	0.00	2	"{}"	2025-06-20 06:26:42.433	\N
session_1750400835954_3ue8feiay	12	memory	10.00	completed	won	23.00	8	"{}"	2025-06-20 06:27:15.954	\N
session_1750404104423_x6tsdmy9i	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 07:21:44.423	\N
session_1750404724603_hd7x0h2k9	12	memory	10.00	completed	lost	0.00	3	"{}"	2025-06-20 07:32:04.603	\N
session_1750404782641_v4qgenesl	12	memory	10.00	completed	lost	0.00	3	"{}"	2025-06-20 07:33:02.641	\N
session_1750404819561_hpnjnc1z3	12	memory	1.00	completed	lost	NaN	8	"{}"	2025-06-20 07:33:39.561	\N
session_1750405281348_uokeyr8j8	12	memory	10.00	completed	lost	0.00	0	"{}"	2025-06-20 07:41:21.348	\N
session_1750405541892_ie0sr66sz	12	memory	1.00	completed	lost	0.00	0	"{}"	2025-06-20 07:45:41.892	\N
session_1750406679863_aa8le7l5d	12	memory	10.00	active	\N	0.00	0	"{}"	2025-06-20 08:04:39.863	\N
session_1750406718420_f7o63m9wd	12	memory	1.00	active	\N	0.00	0	"{}"	2025-06-20 08:05:18.42	\N
session_1750406752119_6vcpdo93o	12	memory	1.00	active	\N	0.00	0	"{}"	2025-06-20 08:05:52.119	\N
session_1750406831070_om9mvfkdi	12	memory	1.00	active	\N	0.00	0	"{}"	2025-06-20 08:07:11.07	\N
session_1750406865720_7duabkt2o	12	memory	1.00	active	\N	0.00	0	"{}"	2025-06-20 08:07:45.72	\N
session_1750407267720_szuc1d4sb	12	memory	1.00	completed	lost	0.00	4	"{}"	2025-06-20 08:14:27.72	\N
session_1750407319955_nfah4mq6d	12	memory	1.00	completed	lost	0.00	4	"{}"	2025-06-20 08:15:19.955	\N
session_1750407354763_7040zlor6	12	memory	1.00	completed	lost	0.00	2	"{}"	2025-06-20 08:15:54.763	\N
session_1750407391442_59w1b24g8	12	memory	1.00	completed	lost	0.00	4	"{}"	2025-06-20 08:16:31.442	\N
session_1750407425513_u6cl3lzqe	12	memory	1.00	completed	lost	0.00	3	"{}"	2025-06-20 08:17:05.513	\N
session_1750407463769_9tqdej91p	12	memory	1.00	completed	won	2.00	8	"{}"	2025-06-20 08:17:43.769	\N
\.


--
-- TOC entry 5028 (class 0 OID 17812)
-- Dependencies: 221
-- Data for Name: game_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.game_settings (id, max_time, max_moves, win_multiplier, min_bet, max_bet, updated_at) FROM stdin;
1	30	20	2.00	1.00	1000.00	2025-06-19 21:55:49.306
\.


--
-- TOC entry 5030 (class 0 OID 17825)
-- Dependencies: 223
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- TOC entry 5032 (class 0 OID 17838)
-- Dependencies: 225
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_methods (id, name, type, is_active, settings, created_at) FROM stdin;
\.


--
-- TOC entry 5034 (class 0 OID 17849)
-- Dependencies: 227
-- Data for Name: payment_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_settings (id, provider, is_test_mode, client_id, client_secret, secret_key, is_active, min_deposit_amount, max_deposit_amount, min_withdrawal_amount, max_withdrawal_amount, withdrawal_fee_percentage, updated_at) FROM stdin;
3	pix	t				t	10.00	100000.00	10.00	100000.00	1.00	2025-06-18 11:10:51.790016
2	plisio	t			H6CuCwgRl1mp38gc2OSFz9RGe-rAVgWLnSHl0-uqRkhdhLDT5pyvqQf-D-TVRH_W	t	10.00	1000.00	10.00	1000.00	5.00	2025-06-19 09:21:27.916
1	primepag	t	98e38184-8d95-4be1-97bb-abe5b8f8d886	ad35160d-4e84-4371-a190-c442588fe2e4		t	10.00	1000.00	10.00	1000.00	5.00	2025-06-19 09:21:36.185
\.


--
-- TOC entry 5036 (class 0 OID 17866)
-- Dependencies: 229
-- Data for Name: referral_commissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referral_commissions (id, referrer_id, referred_id, game_session_id, bet_amount, commission_amount, commission_percentage, status, created_at, paid_at) FROM stdin;
\.


--
-- TOC entry 5038 (class 0 OID 17878)
-- Dependencies: 231
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_settings (id, site_name, favicon, logo_light, logo_dark, primary_color, theme, updated_at) FROM stdin;
1	Memória Premiada	/uploads/file-1750343913082-488948375.png	/uploads/file-1749935589778-994419805.png	/uploads/file-1749935593847-981555617.png	#6366f1	light	2025-06-19 14:38:38.455
\.


--
-- TOC entry 5040 (class 0 OID 17891)
-- Dependencies: 233
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, type, amount, balance_before, balance_after, description, payment_method, game_session_id, external_txn_id, order_number, status, metadata, created_at) FROM stdin;
187	12	bet	2.00	874.00	872.00	SECURE: Memory game bet - Session session_1750395286132_g7fpz6nrv	\N	session_1750395286132_g7fpz6nrv	\N	\N	pending	{}	2025-06-20 01:54:46.13814
188	12	bet	10.00	872.00	862.00	SECURE: Memory game bet - Session session_1750395327706_qppycoxum	\N	session_1750395327706_qppycoxum	\N	\N	pending	{}	2025-06-20 01:55:27.726147
189	12	bet	10.00	862.00	852.00	SECURE: Memory game bet - Session session_1750395368753_bdx2ww7wn	\N	session_1750395368753_bdx2ww7wn	\N	\N	pending	{}	2025-06-20 01:56:08.755946
190	12	bet	10.00	852.00	842.00	SECURE: Memory game bet - Session session_1750395403546_m1ttnf0k9	\N	session_1750395403546_m1ttnf0k9	\N	\N	pending	{}	2025-06-20 01:56:43.549563
191	12	bet	10.00	842.00	832.00	SECURE: Memory game bet - Session session_1750395506847_uvxxz62cg	\N	session_1750395506847_uvxxz62cg	\N	\N	pending	{}	2025-06-20 01:58:26.853025
192	12	bet	10.00	832.00	822.00	SECURE: Memory game bet - Session session_1750395552368_90iukk7yi	\N	session_1750395552368_90iukk7yi	\N	\N	pending	{}	2025-06-20 01:59:12.371079
193	12	bet	10.00	822.00	812.00	SECURE: Memory game bet - Session session_1750395588704_cf12zmlep	\N	session_1750395588704_cf12zmlep	\N	\N	pending	{}	2025-06-20 01:59:48.707172
194	12	bet	20.00	812.00	792.00	SECURE: Memory game bet - Session session_1750395622749_8qf688eyu	\N	session_1750395622749_8qf688eyu	\N	\N	pending	{}	2025-06-20 02:00:22.752147
195	12	game_win	35.00	792.00	827.00	HASH WIN: Memory game - 8/8 pairs - Trust: 0.75 - Session session_1750395622749_8qf688eyu	\N	session_1750395622749_8qf688eyu	\N	\N	pending	{}	2025-06-20 02:00:48.17495
196	12	bet	10.00	827.00	817.00	SECURE: Memory game bet - Session session_1750395855041_1z1jiyu8b	\N	session_1750395855041_1z1jiyu8b	\N	\N	pending	{}	2025-06-20 02:04:15.045374
197	12	bet	10.00	817.00	807.00	SECURE: Memory game bet - Session session_1750396180176_m2vg0vjhc	\N	session_1750396180176_m2vg0vjhc	\N	\N	pending	{}	2025-06-20 02:09:40.180192
198	12	bet	10.00	807.00	797.00	SECURE: Memory game bet - Session session_1750396310997_xn3b0cjzd	\N	session_1750396310997_xn3b0cjzd	\N	\N	pending	{}	2025-06-20 02:11:51.004873
199	12	bet	10.00	797.00	787.00	SECURE: Memory game bet - Session session_1750396363337_qeszjuo9g	\N	session_1750396363337_qeszjuo9g	\N	\N	pending	{}	2025-06-20 02:12:43.342575
200	12	bet	10.00	787.00	777.00	SECURE: Memory game bet - Session session_1750396469171_zdxmvsa28	\N	session_1750396469171_zdxmvsa28	\N	\N	pending	{}	2025-06-20 02:14:29.181972
201	12	bet	10.00	777.00	767.00	SECURE: Memory game bet - Session session_1750396526224_1fw5b7ltp	\N	session_1750396526224_1fw5b7ltp	\N	\N	pending	{}	2025-06-20 02:15:26.231392
202	12	bet	10.00	767.00	757.00	SECURE: Memory game bet - Session session_1750398154323_7dv6z8j5u	\N	session_1750398154323_7dv6z8j5u	\N	\N	pending	{}	2025-06-20 02:42:34.332987
203	12	bet	10.00	757.00	747.00	SECURE: Memory game bet - Session session_1750398390160_v60q9lfqu	\N	session_1750398390160_v60q9lfqu	\N	\N	pending	{}	2025-06-20 02:46:30.17147
204	12	bet	50.00	747.00	697.00	SECURE: Memory game bet - Session session_1750398458289_6iyned960	\N	session_1750398458289_6iyned960	\N	\N	pending	{}	2025-06-20 02:47:38.293572
205	12	bet	10.00	697.00	687.00	SECURE: Memory game bet - Session session_1750398512192_oixmyzmb8	\N	session_1750398512192_oixmyzmb8	\N	\N	pending	{}	2025-06-20 02:48:32.195752
206	12	bet	10.00	687.00	677.00	SECURE: Memory game bet - Session session_1750399050626_q9i4tw0xb	\N	session_1750399050626_q9i4tw0xb	\N	\N	pending	{}	2025-06-20 02:57:30.639516
207	12	bet	10.00	677.00	667.00	SECURE: Memory game bet - Session session_1750399162290_hsosbf03k	\N	session_1750399162290_hsosbf03k	\N	\N	pending	{}	2025-06-20 02:59:22.292962
208	12	bet	10.00	667.00	657.00	SECURE: Memory game bet - Session session_1750399211304_poq6zniqz	\N	session_1750399211304_poq6zniqz	\N	\N	pending	{}	2025-06-20 03:00:11.307506
209	12	game_win	17.00	657.00	674.00	HASH WIN: Memory game - 8/8 pairs - Trust: 0.75 - Session session_1750399211304_poq6zniqz	\N	session_1750399211304_poq6zniqz	\N	\N	pending	{}	2025-06-20 03:00:52.687801
210	12	bet	10.00	674.00	664.00	SECURE: Memory game bet - Session session_1750400537131_629vrvmif	\N	session_1750400537131_629vrvmif	\N	\N	pending	{}	2025-06-20 03:22:17.14095
211	12	bet	20.00	664.00	644.00	SECURE: Memory game bet - Session session_1750400591481_y4fg9gc8o	\N	session_1750400591481_y4fg9gc8o	\N	\N	pending	{}	2025-06-20 03:23:11.486124
212	12	bet	50.00	644.00	594.00	SECURE: Memory game bet - Session session_1750400655362_xlsmmv9a1	\N	session_1750400655362_xlsmmv9a1	\N	\N	pending	{}	2025-06-20 03:24:15.365619
213	12	bet	2.00	594.00	592.00	SECURE: Memory game bet - Session session_1750400690947_5ox36d6b9	\N	session_1750400690947_5ox36d6b9	\N	\N	pending	{}	2025-06-20 03:24:50.950887
214	12	bet	2.00	592.00	590.00	SECURE: Memory game bet - Session session_1750400732290_abvvphsy0	\N	session_1750400732290_abvvphsy0	\N	\N	pending	{}	2025-06-20 03:25:32.293762
215	12	bet	20.00	590.00	570.00	SECURE: Memory game bet - Session session_1750400767873_9y1xt3uev	\N	session_1750400767873_9y1xt3uev	\N	\N	pending	{}	2025-06-20 03:26:07.876225
216	12	bet	2.00	570.00	568.00	SECURE: Memory game bet - Session session_1750400802433_yk4okpzsb	\N	session_1750400802433_yk4okpzsb	\N	\N	pending	{}	2025-06-20 03:26:42.436831
217	12	bet	10.00	568.00	558.00	SECURE: Memory game bet - Session session_1750400835954_3ue8feiay	\N	session_1750400835954_3ue8feiay	\N	\N	pending	{}	2025-06-20 03:27:15.958125
218	12	game_win	23.00	558.00	581.00	HASH WIN: Memory game - 8/8 pairs - Trust: 0.75 - Session session_1750400835954_3ue8feiay	\N	session_1750400835954_3ue8feiay	\N	\N	pending	{}	2025-06-20 03:27:42.583907
219	12	bet	10.00	571.00	561.00	SECURE: Memory game bet - Session session_1750404724603_hd7x0h2k9	\N	session_1750404724603_hd7x0h2k9	\N	\N	pending	{}	2025-06-20 04:32:04.611184
220	12	bet	10.00	561.00	551.00	SECURE: Memory game bet - Session session_1750404782641_v4qgenesl	\N	session_1750404782641_v4qgenesl	\N	\N	pending	{}	2025-06-20 04:33:02.647577
221	12	bet	1.00	551.00	550.00	SECURE: Memory game bet - Session session_1750404819561_hpnjnc1z3	\N	session_1750404819561_hpnjnc1z3	\N	\N	pending	{}	2025-06-20 04:33:39.566761
222	12	bet	10.00	550.00	540.00	SECURE: Memory game bet - Session session_1750405281348_uokeyr8j8	\N	session_1750405281348_uokeyr8j8	\N	\N	pending	{}	2025-06-20 04:41:21.355595
223	12	bet	1.00	540.00	539.00	SECURE: Memory game bet - Session session_1750405541892_ie0sr66sz	\N	session_1750405541892_ie0sr66sz	\N	\N	pending	{}	2025-06-20 04:45:41.89844
224	12	bet	10.00	539.00	529.00	SECURE: Memory game bet - Session session_1750406679863_aa8le7l5d	\N	session_1750406679863_aa8le7l5d	\N	\N	pending	{}	2025-06-20 05:04:39.87692
225	12	bet	1.00	529.00	528.00	SECURE: Memory game bet - Session session_1750406718420_f7o63m9wd	\N	session_1750406718420_f7o63m9wd	\N	\N	pending	{}	2025-06-20 05:05:18.430124
226	12	bet	1.00	528.00	527.00	SECURE: Memory game bet - Session session_1750406752119_6vcpdo93o	\N	session_1750406752119_6vcpdo93o	\N	\N	pending	{}	2025-06-20 05:05:52.125922
227	12	bet	1.00	527.00	526.00	SECURE: Memory game bet - Session session_1750406831070_om9mvfkdi	\N	session_1750406831070_om9mvfkdi	\N	\N	pending	{}	2025-06-20 05:07:11.077064
228	12	bet	1.00	526.00	525.00	SECURE: Memory game bet - Session session_1750406865720_7duabkt2o	\N	session_1750406865720_7duabkt2o	\N	\N	pending	{}	2025-06-20 05:07:45.727598
229	12	bet	1.00	525.00	524.00	SECURE: Memory game bet - Session session_1750407267720_szuc1d4sb	\N	session_1750407267720_szuc1d4sb	\N	\N	pending	{}	2025-06-20 05:14:27.739856
230	12	bet	1.00	524.00	523.00	SECURE: Memory game bet - Session session_1750407319955_nfah4mq6d	\N	session_1750407319955_nfah4mq6d	\N	\N	pending	{}	2025-06-20 05:15:19.960597
231	12	bet	1.00	523.00	522.00	SECURE: Memory game bet - Session session_1750407354763_7040zlor6	\N	session_1750407354763_7040zlor6	\N	\N	pending	{}	2025-06-20 05:15:54.767428
232	12	bet	1.00	522.00	521.00	SECURE: Memory game bet - Session session_1750407391442_59w1b24g8	\N	session_1750407391442_59w1b24g8	\N	\N	pending	{}	2025-06-20 05:16:31.445668
233	12	bet	1.00	521.00	520.00	SECURE: Memory game bet - Session session_1750407425513_u6cl3lzqe	\N	session_1750407425513_u6cl3lzqe	\N	\N	pending	{}	2025-06-20 05:17:05.517721
234	12	bet	1.00	520.00	519.00	SECURE: Memory game bet - Session session_1750407463769_9tqdej91p	\N	session_1750407463769_9tqdej91p	\N	\N	pending	{}	2025-06-20 05:17:43.774932
235	12	game_win	2.00	519.00	521.00	HASH WIN: Memory game - 8/8 pairs - Trust: 0.75 - Session session_1750407463769_9tqdej91p	\N	session_1750407463769_9tqdej91p	\N	\N	pending	{}	2025-06-20 05:18:07.363716
\.


--
-- TOC entry 5042 (class 0 OID 17903)
-- Dependencies: 235
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, user_token, username, password, email, name, phone, cpf, balance, bonus_balance, total_earnings, total_withdrawals, withdrawal_blocked, deposit_blocked, account_blocked, referral_code, referred_by, has_received_referral_bonus, active_session_id, last_login_at, created_at, updated_at) FROM stdin;
12	mh9vUmX7Q6	terezo2@k.com	$2b$12$Bc3Lw1O8PN8jLHUixAVLn.tz8yOcIOCyW4UUk880/YWTk2E3K2Sda	terezo2@k.com	terezo2	(23) 12313-2132	664.121.212-12	521.00	0.00	288.00	0.00	f	f	f	MEMOBZLKR6B9JPXJ	\N	f	c21302a6c380489032333ea90064139e4eaf940cdd0e3d4831342028c6d82abf	2025-06-20 08:46:51.163	2025-06-19 05:35:32.594842	2025-06-20 08:46:51.163
11	qkyP6M2cKY	marinho@l.com	$2b$12$Enf187.dcgPAHwfhoZyC8.Ok8NGAdiVcNN2ClddRG0TSWVeTHj4ke	marinho@l.com	marinho	(54) 54545-4545	784.545.454-54	0.00	0.00	0.00	0.00	f	f	f	MEMOIJUAIIHF94DM	\N	f	\N	\N	2025-06-19 05:31:51.520222	2025-06-19 05:31:51.520222
2	FmSR5ViSfD	cuca@beludo.com	$2b$12$2yHFv0N0KaPDfceRwbE2n.1rRRw4MLI2vXmXDilNNwj8uIi.FKz5K	cuca@beludo.com	Seucuca	(11) 11111-1111	111.111.111-11	599.00	0.00	0.00	0.00	f	f	f	MEMOON1XUASXGR1B	\N	f	1e05f97b85ffd33a4d9521e28aad3e27b06d21966a8df3c274a677a3fb1ab0af	2025-06-19 02:45:45.059	2025-06-18 23:17:30.045323	2025-06-19 02:45:45.059
10	AkFPRLCWh3	locrecio@l.com	$2b$12$5UOtnSr2zRtHlVZ9A9CWCezeBwZ922vxxhcbvo8jIVcVovvHxpsOG	locrecio@l.com	locrecio	(33) 33333-3111	000.000.000-00	583.00	0.00	52.00	0.00	f	f	f	MEMOATTF6UFMIX4T	\N	f	d4ce605d5dfd6cc00e31f1d53b6a43ac7109036e724d89dc13f6d4fda9341b76	2025-06-20 03:31:51.151	2025-06-19 04:36:55.413173	2025-06-20 03:31:51.151
\.


--
-- TOC entry 5057 (class 0 OID 0)
-- Dependencies: 217
-- Name: affiliate_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.affiliate_settings_id_seq', 1, false);


--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 220
-- Name: game_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.game_settings_id_seq', 1, true);


--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 222
-- Name: password_resets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_resets_id_seq', 1, false);


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 224
-- Name: payment_methods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_methods_id_seq', 1, false);


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 226
-- Name: payment_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_settings_id_seq', 3, true);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 228
-- Name: referral_commissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.referral_commissions_id_seq', 1, false);


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 230
-- Name: site_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.site_settings_id_seq', 1, true);


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 232
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 235, true);


--
-- TOC entry 5065 (class 0 OID 0)
-- Dependencies: 234
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- TOC entry 4843 (class 2606 OID 17800)
-- Name: affiliate_settings affiliate_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_settings
    ADD CONSTRAINT affiliate_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4845 (class 2606 OID 17810)
-- Name: game_sessions game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4847 (class 2606 OID 17823)
-- Name: game_settings game_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_settings
    ADD CONSTRAINT game_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4849 (class 2606 OID 17834)
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- TOC entry 4851 (class 2606 OID 17836)
-- Name: password_resets password_resets_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_unique UNIQUE (token);


--
-- TOC entry 4853 (class 2606 OID 17847)
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- TOC entry 4855 (class 2606 OID 17864)
-- Name: payment_settings payment_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_settings
    ADD CONSTRAINT payment_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4857 (class 2606 OID 17876)
-- Name: referral_commissions referral_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_commissions
    ADD CONSTRAINT referral_commissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4859 (class 2606 OID 17889)
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4861 (class 2606 OID 17901)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4863 (class 2606 OID 17926)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 4865 (class 2606 OID 17920)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4867 (class 2606 OID 17928)
-- Name: users users_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);


--
-- TOC entry 4869 (class 2606 OID 17922)
-- Name: users users_user_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_token_unique UNIQUE (user_token);


--
-- TOC entry 4871 (class 2606 OID 17924)
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- TOC entry 4872 (class 2606 OID 17929)
-- Name: game_sessions game_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4873 (class 2606 OID 17934)
-- Name: password_resets password_resets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4874 (class 2606 OID 17949)
-- Name: referral_commissions referral_commissions_game_session_id_game_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_commissions
    ADD CONSTRAINT referral_commissions_game_session_id_game_sessions_id_fk FOREIGN KEY (game_session_id) REFERENCES public.game_sessions(id);


--
-- TOC entry 4875 (class 2606 OID 17944)
-- Name: referral_commissions referral_commissions_referred_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_commissions
    ADD CONSTRAINT referral_commissions_referred_id_users_id_fk FOREIGN KEY (referred_id) REFERENCES public.users(id);


--
-- TOC entry 4876 (class 2606 OID 17939)
-- Name: referral_commissions referral_commissions_referrer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_commissions
    ADD CONSTRAINT referral_commissions_referrer_id_users_id_fk FOREIGN KEY (referrer_id) REFERENCES public.users(id);


--
-- TOC entry 4877 (class 2606 OID 17959)
-- Name: transactions transactions_game_session_id_game_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_game_session_id_game_sessions_id_fk FOREIGN KEY (game_session_id) REFERENCES public.game_sessions(id);


--
-- TOC entry 4878 (class 2606 OID 17954)
-- Name: transactions transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


-- Completed on 2025-06-20 05:53:21

--
-- PostgreSQL database dump complete
--

