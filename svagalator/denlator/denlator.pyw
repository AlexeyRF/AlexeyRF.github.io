import tkinter as tk
from tkinter import messagebox, filedialog
import math

def convert_to_float(value):
    # Заменяем запятую на точку, если пользователь ввёл запятую
    value = value.replace(',', '.')
    if '^' in value:
        base, exp = value.split('^')
        return float(base) * (10 ** float(exp))
    return float(value)

def calculate(mass, radius_km, distance):
    try:
        radius = radius_km * 1000  # Переводим радиус в метры
        G = 6.674e-11
        g = G * mass / radius**2
        v1 = math.sqrt(G * mass / radius)
        T = 2 * math.pi * math.sqrt(distance**3 / (G * 1.989e30))
        v_orbit = math.sqrt(G * 1.989e30 / distance)
        F_sun = G * mass * 1.989e30 / distance**2

        result = f"g: {g:.2f} м/с²\nv1: {v1:.2f} м/с\nT: {T/(3600*24):.2f} дн\nv_orbit: {v_orbit:.2f} м/с\nF: {F_sun:.2f} Н"
        return result
    except ValueError:
        messagebox.showerror("Ошибка", "Некорректные значения. Убедитесь, что введены числа.")
        return None

def save_result(result, planet_name):
    if result:
        file_path = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text files", "*.txt")], title="Сохранить результат")
        if file_path:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(f"Параметры планеты {planet_name}:\n{result}")

def create_planet():
    create_window = tk.Toplevel(root)
    create_window.title("Создать новую планету")

    labels = [
        "Название планеты:",
        "Масса (кг): Например, 5.972^24 (масса Земли):",
        "Радиус (км): Например, 6371 (радиус Земли):",
        "Расстояние до Солнца (м): Например, 1.496^11 (расстояние от Земли до Солнца):"
    ]
    entries = [tk.Entry(create_window) for _ in labels]

    for label, entry in zip(labels, entries):
        tk.Label(create_window, text=label).pack()
        entry.pack()

    def on_continue():
        try:
            planet_name = entries[0].get().strip()
            mass = convert_to_float(entries[1].get().strip())
            radius_km = convert_to_float(entries[2].get().strip())
            distance = convert_to_float(entries[3].get().strip())

            result = calculate(mass, radius_km, distance)
            if result:
                save_result(result, planet_name)
                messagebox.showinfo("Результаты", f"Результаты для планеты {planet_name}:\n{result}")
            create_window.destroy()
        except ValueError as e:
            messagebox.showerror("Ошибка", f"Некорректные данные: {e}")

    tk.Button(create_window, text="Продолжить", command=on_continue).pack()

root = tk.Tk()
root.title("Расчет параметров планеты")

tk.Button(root, text="Создать", command=create_planet).pack()
root.mainloop()