-- IndieAppCircle is a player's own (student) plan. 0049 first wrote it as a teacher plan and reached production that
-- way before it was edited, so this sets the row as 0049 now writes it. Changes nothing where it already is.
UPDATE "plans" SET "role" = 'student', "students" = 0, "extra_students" = 0 WHERE "id" = 'indieappcircle';
