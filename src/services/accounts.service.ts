class AccountsService {
  private readonly ACCOUNTS_BASE_URL = "/api/accounts";

  async getAllAccounts(): Promise<any> {
    return fetch(this.ACCOUNTS_BASE_URL + "/get-accounts").then((res) =>
      res.json()
    );
  }
}

export default new AccountsService();
