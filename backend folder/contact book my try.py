contacts = []

def add_contact():
    name = input("Enter your name: ")
    phone = input("Enter your phone: ")
    email = input("Enter your email: ")
    contacts.append({'name': name, 'phone': phone,'email': email})
    print("Contacts added successfully\n")

def view_contact():
    if not contacts:
        print("Contact not found\n")
        return
    for contact in contacts:
        print(f"Name: {contact['name']}, Phone: {contact['phone']}, Email: {contact['email']}")
    print()

def search_contact():
    name = input("Enter the name to search: ")
    for contact in contacts:
       if contact['name'].lower() == name.lower():
           print(f"Found: {contact}")
           return
    print("Contact not found")
           
def delete_contact():
    name = input("Enter the name to delete: ")
    for contact in contacts:
       if contact['name'].lower() == name.lower():
           contacts.remove(contact)
           print("Contact deleted\n")
           return
    print("Contact not found.\n")

while True:
    print("1. Add Contact")
    print("2. View Contacts")
    print("3. Search Contact")
    print("4. Delete Contact")
    print("5. Exit")

    choice = input("Enter Your choice: ")

    if choice == "1":
        add_contact()
    elif choice == "2":
        view_contact()
    elif choice == "3":
        search_contact()
    elif choice == "4":
        delete_contact()
    elif choice == "5":
        print("Goodbye")
        break
    else:
        print("Invalid choice. Try again.\n")
    