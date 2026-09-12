
create table public.color_palettes
(
    id   serial not null ,
    "name" varchar not null,
    field varchar not null,
    ink_light varchar,
    ink_dark varchar,
    CONSTRAINT color_palettes_pk PRIMARY KEY (id)
);

INSERT INTO color_palettes (name, field, ink_dark)
VALUES
('green', '#2B7454', '#F4E9CE'),
('brown', '#2B1A13', '#EBD9B4'),
('cream', '#DFD1B0', '#2B1A14'),
('red', '#BA422C', '#F9EDD4'),
('blue', '#2C4B6E', '#EFE2C8'),
('plum', '#6B3350', '#F2E4CE'),
('amber', '#C9973B', '#2B1A14'),
('rose', '#D4A0A7', '#2B1A14');