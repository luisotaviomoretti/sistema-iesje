#!/usr/bin/env python3
"""
Script para converter o CSV em comandos INSERT SQL para a tabela previous_year_students
Útil quando não é possível usar COPY diretamente no Supabase
"""

import csv
import json
from datetime import datetime

def clean_text(value):
    """Limpa e escapa texto para SQL"""
    if not value or value == 'n.a' or value == '':
        return 'NULL'
    # Escapa aspas simples
    value = value.replace("'", "''")
    return f"'{value}'"

def clean_cpf(cpf):
    """Remove formatação do CPF"""
    if not cpf or cpf == 'n.a' or cpf == '':
        return 'NULL'
    # Remove tudo exceto números
    cpf_digits = ''.join(c for c in cpf if c.isdigit())
    if cpf_digits:
        return f"'{cpf_digits}'"
    return 'NULL'

def convert_date(date_str):
    """Converte data do formato DD/MM/YYYY para YYYY-MM-DD"""
    if not date_str or date_str == 'n.a' or date_str == '':
        return 'NULL'
    try:
        parts = date_str.split('/')
        if len(parts) == 3:
            return f"'{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}'"
    except:
        pass
    return 'NULL'

def clean_decimal(value):
    """Limpa e converte valores decimais"""
    if not value or value == 'n.a' or value == '':
        return '0'
    try:
        # Remove espaços e substitui vírgula por ponto
        value = value.strip().replace(',', '.')
        return str(float(value))
    except:
        return '0'

def process_gender(gender):
    """Processa gênero"""
    if not gender or gender == 'n.a' or gender == '':
        return 'NULL'
    gender = gender.upper().strip()
    if gender in ['M', 'F']:
        return f"'{gender}'"
    return 'NULL'

def process_escola(escola):
    """Processa nome da escola"""
    if not escola or escola == 'n.a' or escola == '':
        return 'NULL'
    # Converte para lowercase e substitui espaços por underscore
    escola = escola.lower().replace(' ', '_')
    return f"'{escola}'"

def create_discounts_json(discount_code, discount_description, discount_percentage):
    """Cria JSON de descontos aplicados"""
    percentage = float(clean_decimal(discount_percentage))
    if not discount_code or discount_code == '' or percentage == 0:
        return "'[]'::jsonb"

    discount = {
        'discount_code': discount_code,
        'discount_name': discount_description or f'Desconto {discount_code}',
        'percentage': percentage,
        'requires_documents': True
    }

    json_str = json.dumps([discount], ensure_ascii=False)
    # Escapa aspas simples no JSON
    json_str = json_str.replace("'", "''")
    return f"'{json_str}'::jsonb"

def generate_insert_statements(csv_file, output_file, batch_size=100):
    """Gera comandos INSERT em lotes"""

    with open(csv_file, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=';')

        with open(output_file, 'w', encoding='utf-8') as sqlfile:
            sqlfile.write("-- Auto-generated SQL from CSV\n")
            sqlfile.write("-- Generated at: " + datetime.now().isoformat() + "\n\n")
            sqlfile.write("BEGIN;\n\n")

            batch = []
            batch_count = 0
            total_count = 0

            for row in reader:
                # Pula linhas vazias ou cabeçalho duplicado
                if not row.get('student_name') or row['student_name'] == 'student_name':
                    continue

                values = (
                    clean_text(row.get('student_name')),
                    clean_cpf(row.get('student_cpf')),
                    clean_text(row.get('student_rg')),
                    convert_date(row.get('student_birth_date')),
                    process_gender(row.get('student_gender')),
                    process_escola(row.get('student_escola')),
                    clean_text(row.get('series_id')),
                    clean_text(row.get('series_name')),
                    clean_text(row.get('track_id')),
                    clean_text(row.get('track_name')),
                    clean_text(row.get('shift').lower() if row.get('shift') else ''),
                    clean_text(row.get('guardian1_name')),
                    clean_cpf(row.get('guardian1_cpf')),
                    clean_text(row.get('guardian1_phone')),
                    clean_text(row.get('guardian1_email')),
                    clean_text(row.get('guardian1_relationship')),
                    clean_text(row.get('guardian2_name')),
                    clean_cpf(row.get('guardian2_cpf')),
                    clean_text(row.get('guardian2_phone')),
                    clean_text(row.get('guardian2_email')),
                    clean_text(row.get('guardian2_relationship')),
                    clean_cpf(row.get('address_cep')),
                    clean_text(row.get('address_street')),
                    clean_text(row.get('address_number')),
                    clean_text(row.get('address_complement') if row.get('address_complement') != 'n.a' else ''),
                    clean_text(row.get('address_district')),
                    clean_text(row.get('address_city')),
                    clean_text(row.get('address_state').upper() if row.get('address_state') else ''),
                    clean_decimal(row.get('base_value')),
                    clean_decimal(row.get('total_discount_percentage')),
                    clean_decimal(row.get('total_discount_value')),
                    clean_decimal(row.get('final_monthly_value')),
                    clean_decimal(row.get('material_cost')),
                    create_discounts_json(
                        row.get('discount_code'),
                        row.get('discount_description'),
                        row.get('total_discount_percentage')
                    ),
                    "'2024'",  # academic_year
                    "'approved'",  # status
                    "NOW()",  # created_at
                    "NOW()"   # updated_at
                )

                batch.append(f"({', '.join(values)})")
                total_count += 1

                # Escreve o batch quando atinge o tamanho limite
                if len(batch) >= batch_size:
                    batch_count += 1
                    sqlfile.write(f"-- Batch {batch_count} (records {total_count - batch_size + 1} to {total_count})\n")
                    sqlfile.write("INSERT INTO public.previous_year_students (\n")
                    sqlfile.write("  student_name, student_cpf, student_rg, student_birth_date, student_gender,\n")
                    sqlfile.write("  student_escola, series_id, series_name, track_id, track_name, shift,\n")
                    sqlfile.write("  guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,\n")
                    sqlfile.write("  guardian2_name, guardian2_cpf, guardian2_phone, guardian2_email, guardian2_relationship,\n")
                    sqlfile.write("  address_cep, address_street, address_number, address_complement,\n")
                    sqlfile.write("  address_district, address_city, address_state,\n")
                    sqlfile.write("  base_value, total_discount_percentage, total_discount_value,\n")
                    sqlfile.write("  final_monthly_value, material_cost, applied_discounts,\n")
                    sqlfile.write("  academic_year, status, created_at, updated_at\n")
                    sqlfile.write(") VALUES\n")
                    sqlfile.write(',\n'.join(batch))
                    sqlfile.write(";\n\n")
                    batch = []

            # Escreve o último batch se houver
            if batch:
                batch_count += 1
                sqlfile.write(f"-- Final batch {batch_count} (records {total_count - len(batch) + 1} to {total_count})\n")
                sqlfile.write("INSERT INTO public.previous_year_students (\n")
                sqlfile.write("  student_name, student_cpf, student_rg, student_birth_date, student_gender,\n")
                sqlfile.write("  student_escola, series_id, series_name, track_id, track_name, shift,\n")
                sqlfile.write("  guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,\n")
                sqlfile.write("  guardian2_name, guardian2_cpf, guardian2_phone, guardian2_email, guardian2_relationship,\n")
                sqlfile.write("  address_cep, address_street, address_number, address_complement,\n")
                sqlfile.write("  address_district, address_city, address_state,\n")
                sqlfile.write("  base_value, total_discount_percentage, total_discount_value,\n")
                sqlfile.write("  final_monthly_value, material_cost, applied_discounts,\n")
                sqlfile.write("  academic_year, status, created_at, updated_at\n")
                sqlfile.write(") VALUES\n")
                sqlfile.write(',\n'.join(batch))
                sqlfile.write(";\n\n")

            sqlfile.write("COMMIT;\n\n")
            sqlfile.write(f"-- Total records processed: {total_count}\n")
            sqlfile.write(f"-- Total batches: {batch_count}\n")

            # Adiciona verificação
            sqlfile.write("\n-- Verification query\n")
            sqlfile.write("SELECT COUNT(*) as total_imported,\n")
            sqlfile.write("       COUNT(DISTINCT student_cpf) as unique_cpfs,\n")
            sqlfile.write("       AVG(final_monthly_value)::DECIMAL(10,2) as avg_value\n")
            sqlfile.write("FROM public.previous_year_students\n")
            sqlfile.write("WHERE academic_year = '2024';\n")

    print(f"SQL file generated: {output_file}")
    print(f"Total records: {total_count}")
    print(f"Total batches: {batch_count}")

if __name__ == "__main__":
    csv_file = "previous_year_students_rows_upload.csv"
    output_file = "supabase/migrations/035_insert_previous_year_students_batch.sql"

    generate_insert_statements(csv_file, output_file, batch_size=100)
    print("\nTo use the generated SQL:")
    print("1. Open Supabase SQL Editor")
    print("2. Copy and paste the content from", output_file)
    print("3. Execute the SQL in batches if needed")