create table consumption_types(
    id   serial primary key,
    name text not null
);

INSERT INTO consumption_types (name) VALUES
('Bottle'),
('Can'),
('Draft/Tap');