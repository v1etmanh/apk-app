-- 1. dish_thermogenic_score (weighted average theo quantity_g)
UPDATE dishes
SET dish_thermogenic_score = (
    SELECT ROUND(SUM(di.quantity_g * COALESCE(i.thermogenic_score, 0)) 
                 / NULLIF(SUM(CASE WHEN i.thermogenic_score IS NOT NULL 
                              THEN di.quantity_g ELSE 0 END), 0), 4)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
);

dish_thermogenic_score represent cho 

-- 2. dish_hydration_score
UPDATE dishes
SET dish_hydration_score = (
    SELECT ROUND(SUM(di.quantity_g * COALESCE(i.hydration_score, 0)) 
                 / NULLIF(SUM(CASE WHEN i.hydration_score IS NOT NULL 
                              THEN di.quantity_g ELSE 0 END), 0), 4)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
);

-- 3. dish_warming_score
UPDATE dishes
SET dish_warming_score = (
    SELECT ROUND(SUM(di.quantity_g * COALESCE(i.warming_score, 0)) 
                 / NULLIF(SUM(CASE WHEN i.warming_score IS NOT NULL 
                              THEN di.quantity_g ELSE 0 END), 0), 4)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
);

-- 4. dish_cooling_score
UPDATE dishes
SET dish_cooling_score = (
    SELECT ROUND(SUM(di.quantity_g * COALESCE(i.cooling_score, 0)) 
                 / NULLIF(SUM(CASE WHEN i.cooling_score IS NOT NULL 
                              THEN di.quantity_g ELSE 0 END), 0), 4)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
);

-- 5. dish_satiety_score
UPDATE dishes
SET dish_satiety_score = (
    SELECT ROUND(SUM(di.quantity_g * COALESCE(i.satiety_score, 0)) 
                 / NULLIF(SUM(CASE WHEN i.satiety_score IS NOT NULL 
                              THEN di.quantity_g ELSE 0 END), 0), 4)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
);

-- 6. dish_energy_total: SUM(qty × energy_density / 100)
UPDATE dishes
SET dish_energy_total = (
    SELECT ROUND(SUM(di.quantity_g * COALESCE(i.energy_density, 0) / 100.0), 2)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
      AND i.energy_density IS NOT NULL
);

-- 7. dish_sodium_total: SUM(qty × sodium_density / 100)
UPDATE dishes
SET dish_sodium_total = (
    SELECT ROUND(SUM(di.quantity_g * COALESCE(i.sodium_density, 0) / 100.0), 2)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
      AND i.sodium_density IS NOT NULL
);

-- 8. is_vegan: 0 nếu có bất kỳ ingredient nào is_animal_based = 1
UPDATE dishes
SET is_vegan = (
    SELECT CASE 
        WHEN SUM(COALESCE(i.is_animal_based, 0)) = 0 THEN 1 
        ELSE 0 
    END
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
);

-- 9. is_vegetarian: cho phép trứng và sữa, loại thịt và hải sản
UPDATE dishes
SET is_vegetarian = (
    SELECT CASE 
        WHEN SUM(
            CASE 
                WHEN COALESCE(i.is_animal_based, 0) = 1 
               AND LOWER(COALESCE(i.category, '')) NOT IN ('sữa & trứng')
                THEN 1 
                ELSE 0 
            END
        ) = 0 THEN 1
        ELSE 0
    END
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
);

-- 10. allergen_summary: JSON array tổng hợp từ ingredients
-- SQLite không có GROUP_CONCAT cho JSON nên dùng approach đơn giản
UPDATE dishes
SET allergen_summary = (
    SELECT json_group_array(DISTINCT allergen_item.value)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    CROSS JOIN json_each(
        CASE 
            WHEN i.allergen_tags IS NULL OR i.allergen_tags = '' OR i.allergen_tags = '[]' THEN '[]'
            -- Nếu đã là định dạng JSON mảng rồi thì giữ nguyên
            WHEN i.allergen_tags LIKE '[%' THEN i.allergen_tags
            -- Nếu là dạng chuỗi "a,b,c" thì chuyển thành ["a","b","c"]
            ELSE '["' || REPLACE(REPLACE(i.allergen_tags, ' ', ''), ',', '","') || '"]'
        END
    ) AS allergen_item
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
      AND allergen_item.value IS NOT NULL 
      AND allergen_item.value != ''
);

Dựa trên thiết kế thực thể (Entity Design) bạn đã nêu ở trên, để hỗ trợ người dùng bị tiểu đường (diabetes_flag), bạn cần tính Dish Glycemic Load.Công thức chuẩn: $GL = \sum \frac{GI_{ingredient} \times Carbohydrate_{ingredient}}{100}$Bạn có thể thêm câu lệnh thứ 11 như sau (giả sử bảng ingredients của bạn có cột glycemic_index và carb_density - lượng carb trên 100g):SQL-- 11. dish_glycemic_load: SUM(qty * carb_density/100 * GI / 100)
-- Lưu ý: carb_density là số gram carb trong 100g nguyên liệu
UPDATE dishes
SET dish_glycemic_load = (
    SELECT ROUND(SUM(
        (di.quantity_g * COALESCE(i.carb_density, 0) / 100.0) * -- Tính tổng carb trong nguyên liệu đó
        COALESCE(i.glycemic_index, 0) / 100.0                   -- Nhân với tỉ lệ GI
    ), 2)
    FROM dish_ingredient di
    JOIN ingredients i ON i.id = di.ingredient_id
    WHERE di.recipe_id = dishes.id
      AND di.quantity_g > 0
      AND i.glycemic_index IS NOT NULL
);