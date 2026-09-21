export const SITE_NAME = "Onde Comprar Brasil";

export const STORE_CONTACT = {
  name: SITE_NAME,
  phone: "(19) 98188-0619",
  whatsappUrl:
    process.env.NEXT_PUBLIC_WHATSAPP_URL ??
    "https://wa.me/5519981880619?text=Ola%2C%20acabei%20de%20fazer%20uma%20compra%20para%20retirar%20na%20loja.",
  address: {
    street: "R. Francisco Gomes de Souza",
    number: "08",
    neighborhood: "Jardim Monte Cristo",
    city: "Campinas",
    state: "SP",
    postalCode: "13049-133",
  },
};

export function getStoreAddressLines() {
  return [
    `${STORE_CONTACT.address.street}, ${STORE_CONTACT.address.number}`,
    `${STORE_CONTACT.address.neighborhood} - ${STORE_CONTACT.address.city}/${STORE_CONTACT.address.state}`,
    `CEP ${STORE_CONTACT.address.postalCode}`,
  ];
}
