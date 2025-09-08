-- Create function to batch update document order
CREATE OR REPLACE FUNCTION batch_update_document_order(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_record jsonb;
BEGIN
    -- Loop through each update in the array
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        -- Update the display_order for each document
        UPDATE public.discount_documents
        SET 
            display_order = (update_record->>'display_order')::integer,
            updated_at = NOW()
        WHERE id = (update_record->>'id')::uuid;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_document_order(jsonb) TO authenticated;

-- Add comment
COMMENT ON FUNCTION batch_update_document_order IS 'Batch update display order for discount documents when reordering via drag and drop';