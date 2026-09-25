--- Alcohol subtypes
alter table alcohol_subtypes
    add constraint alcohol_subtypes_color_palettes_id_fk
        foreign key (color_palette_id) references color_palettes
            on delete restrict;

alter table alcohol_subtypes
    add constraint alcohol_subtypes_glassware_id_fk
        foreign key (glassware_id) references glassware
            on delete restrict;

--- Alcohol types
alter table alcohol_types
    add constraint alcohol_types_color_palettes_id_fk
        foreign key (color_palette_id) references color_palettes
            on delete restrict;

alter table alcohol_types
    add constraint alcohol_types_glassware_id_fk
        foreign key (glassware_id) references glassware
            on delete restrict;

-- Beer flavours
alter table beer_flavours
    add constraint beer_flavours_color_palettes_id_fk
        foreign key (color_palette_id) references color_palettes
            on delete restrict;

-- Beer brands
alter table brands
    add constraint brands_color_palettes_id_fk
        foreign key (color_palette_id) references color_palettes
            on delete restrict;

--- Consumption types
alter table consumption_types
    add constraint consumption_types_glassware_id_fk
        foreign key (glassware_id) references glassware
            on delete restrict;

--- Recommendations
alter table recommendations
    add constraint recommendations_color_palettes_id_fk
        foreign key (color_palette_id) references color_palettes
            on delete restrict;

alter table recommendations
    add constraint recommendations_glassware_id_fk
        foreign key (glassware_id) references glassware
            on delete restrict;

--- Default Recommendations
alter table default_recommendations
    add constraint default_recommendations_color_palettes_id_fk
        foreign key (color_palette_id) references color_palettes
            on delete restrict;

alter table default_recommendations
    add constraint default_recommendations_glassware_id_fk
        foreign key (glassware_id) references glassware
            on delete restrict;

--- Saved Drinks
alter table saved_drinks
    add constraint saved_drinks_color_palettes_id_fk
        foreign key (color_palette_id) references color_palettes
            on delete restrict;

alter table saved_drinks
    add constraint saved_drinks_glassware_id_fk
        foreign key (glassware_id) references glassware
            on delete restrict;